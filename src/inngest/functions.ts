import { inngest } from "./client";
import prisma from "@/lib/prisma";

export const leadHunterProcess = inngest.createFunction(
    { id: "lead-hunter-process" },
    { event: "workflow/lead.hunter.start" },
    async ({ event, step }) => {
        const { leadId } = event.data;

        const lead = await step.run("load-lead", async () => {
            return prisma.lead.findUnique({ where: { id: leadId } });
        });

        if (!lead || lead.status !== "RAW") {
            return { status: "Skipped - Already Processed or Not Found" };
        }

        const { email, rawScore } = await step.run("enrich-and-score", async () => {
            // ── Hard suppression gates ─────────────────────────────────────────
            // Non-serviceable markets (add more as needed)
            const nonServiceableMarkets = ["India", "Philippines", "Pakistan", "Nigeria", "Bangladesh"];
            if (lead.country && nonServiceableMarkets.some(m => lead.country!.includes(m))) {
                return { email: null, rawScore: 0 };
            }

            // ── Base score ────────────────────────────────────────────────────
            let score = 40;

            // ── Title / Seniority (up to +25) ─────────────────────────────────
            const title = (lead.title || "").toLowerCase();
            if (/\b(ceo|coo|cfo|cto|cmo|chro|chief)\b/i.test(title)) {
                score += 25;
            } else if (/\bvp\b|vice president/i.test(title)) {
                score += 20;
            } else if (/\bdirector\b/i.test(title)) {
                score += 15;
            } else if (/\bsenior manager\b|\bprincipal\b/i.test(title)) {
                score += 10;
            } else if (/\bmanager\b/i.test(title)) {
                score += 5;
            }

            // ── Career Trigger Signal (up to +20) ─────────────────────────────
            const trigger = (lead.careerTrigger || "").toLowerCase();
            if (trigger) {
                if (/layoff|laid off|job loss|let go|shut down|what.s next|exploring next|between roles/i.test(trigger)) {
                    score += 20;
                } else if (/promotion|new role|just started|relocated|franchise|entrepreneurship|ownership/i.test(trigger)) {
                    score += 15;
                } else {
                    score += 5; // trigger present but generic
                }
            }

            // ── LinkedIn Post Content (up to +10) ─────────────────────────────
            const post = (lead.recentPostSummary || "").toLowerCase();
            if (post) {
                if (/burnout|burned out|autonomy|ownership|side business|w-?2|golden handcuff|corporate grind|tired of|had enough|escape/i.test(post)) {
                    score += 10;
                } else {
                    score += 3; // post present but generic
                }
            }

            // ── Persona Fit Bonus (up to +5) ──────────────────────────────────
            const company = (lead.company || "").toLowerCase();
            if (company) {
                // Fortune 500 / household name proxies (high W2, golden handcuffs likely)
                const enterprise = ["microsoft", "amazon", "google", "meta", "apple", "salesforce", "oracle", "ibm", "deloitte", "accenture", "mckinsey", "jpmorgan", "chase", "bank of america", "wells fargo", "boeing", "ge ", "general electric", "att", "at&t", "verizon"];
                const isFortune500 = enterprise.some(e => company.includes(e));
                if (isFortune500) {
                    score += 5;
                } else if (company.length > 2) {
                    score += 3; // any named company is better than unknown
                }
            }

            // Cap at 100
            if (score > 100) score = 100;

            // ── Email discovery via Hunter.io ──────────────────────────────────
            // Uses the Email Finder endpoint: GET /v2/email-finder?domain=&first_name=&last_name=
            let foundEmail: string | null = lead.email || null;
            let emailConfidence = 100; // If email already known, treat as confident

            if (!foundEmail) {
                const hunterKey = process.env.HUNTER_API_KEY;
                if (hunterKey && lead.company) {
                    try {
                        const nameParts = lead.name.trim().split(/\s+/);
                        const firstName = nameParts[0] ?? "";
                        const lastName = nameParts.slice(1).join(" ") ?? "";

                        // Derive domain from company name (Hunter also accepts company name)
                        const companySlug = lead.company
                            .toLowerCase()
                            .replace(/\s+/g, "")
                            .replace(/[^a-z0-9]/g, "");
                        const domain = `${companySlug}.com`; // best-effort; Hunter normalizes

                        const hunterUrl = new URL("https://api.hunter.io/v2/email-finder");
                        hunterUrl.searchParams.set("domain", domain);
                        hunterUrl.searchParams.set("first_name", firstName);
                        hunterUrl.searchParams.set("last_name", lastName);
                        hunterUrl.searchParams.set("api_key", hunterKey);

                        const res = await fetch(hunterUrl.toString());
                        if (res.ok) {
                            const json = await res.json();
                            if (json?.data?.email) {
                                foundEmail = json.data.email;
                                emailConfidence = json.data.confidence ?? 0;
                            }
                        }
                    } catch (_err) {
                        // Hunter failed — fall through to guess below
                    }
                }

                // Hard suppression: if Hunter found nothing or confidence is too low, suppress.
                // Gate raised to 90 now that SuperSearch pre-verifies emails before DB import (March 2026).
                if (!foundEmail || emailConfidence < 90) {
                    if (!lead.email) {
                        // Last resort guess — will be verified by Instantly's own validation
                        const nameParts = lead.name.trim().split(/\s+/);
                        foundEmail = `${nameParts[0]?.toLowerCase()}.${nameParts.slice(1).join("").toLowerCase()}@${(lead.company || "unknown").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com`;
                        score = Math.min(score, 50); // Cap at 50 — unverified guess cannot clear the 70-point gate
                    }
                }
            }

            return { email: foundEmail, rawScore: score };
        });

        if (rawScore < 70) {
            // Mark as Suppressed or skip
            await step.run("mark-suppressed-or-ignored", async () => {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { status: "SUPPRESSED", score: rawScore, email }
                });
            });
            return { status: "Skipped - Score too low", score: rawScore };
        }

        // Update to ENRICHED
        await step.run("update-to-enriched", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: "ENRICHED", score: rawScore, email }
            });
        });

        // Phase 3 trigger: Personalizer will pick up from here
        // Next step will be published event for Personalizer
        await step.sendEvent("trigger-personalizer", {
            name: "workflow/lead.personalize.start",
            data: { leadId: lead.id }
        });

        return { status: "Enriched", email, rawScore };
    }
);

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

import { PROHIBITED_PHRASES, EMAIL_TEMPLATES, VOICE_RULES, CAN_SPAM_FOOTER } from "@/lib/templates";

export const personalizerProcess = inngest.createFunction(
    { id: "personalizer-process" },
    { event: "workflow/lead.personalize.start" },
    async ({ event, step }) => {
        const { leadId } = event.data;

        const lead = await step.run("load-enriched-lead", async () => {
            return prisma.lead.findUnique({ where: { id: leadId } });
        });

        if (!lead || lead.status !== "ENRICHED") {
            return { status: "Skipped - Not Enriched or Not Found" };
        }

        const { draftEmail } = await step.run("generate-personalized-email", async () => {
            const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
            const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;

            if (!apiKey) throw new Error("Missing OpenAI API Key in Settings");

            const systemPrompt = `You are the Waypoint Franchise Advisors "Personalizer Agent".
Your goal is to write a highly personalized, human-feeling cold email to a corporate professional.

${VOICE_RULES}

PROHIBITED PHRASES (never use any of these):
${PROHIBITED_PHRASES.join(", ")}
AND NO em dashes (—). NO exclamation points (!). AND NO starting three sentences in a row with "I" or "Most".

TEMPLATE REFERENCE — choose the closest template and modify heavily for this specific person:
${EMAIL_TEMPLATES}

FINAL CHECK before outputting: confirm email is 70–140 words, no forbidden phrases, opens without flattery, one call to action, closes with low pressure, reads like a real person wrote it.
`;

            // Pass the scraped details to the model
            const userPrompt = `Prospect Details:
Name: ${lead.name}
Title: ${lead.title || 'Executive'}
Company: ${lead.company || 'Corporate'}
Career Trigger: ${lead.careerTrigger || ''}
Recent Post Summary: ${lead.recentPostSummary || ''}
Pulled Quote from Post: ${lead.pulledQuoteFromPost || ''}
Specific Project/Metric: ${lead.specificProjectOrMetric || ''}
Place/Personal Detail: ${lead.placeOrPersonalDetail || ''}
Franchise Angle: ${lead.franchiseAngle || ''}

Write the email using plain text. Do NOT wrap it in quotes or markdown.`;

            const { text } = await generateText({
                model: openai("gpt-4o"),
                system: systemPrompt,
                prompt: userPrompt,
            });

            return { draftEmail: text };
        });

        // Save to DB and update status
        // CAN-SPAM footer appended here — deterministically, not by the AI
        await step.run("save-draft-email", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    draftEmail: draftEmail + CAN_SPAM_FOOTER,
                    status: "SEQUENCED"
                }
            });
        });

        return { status: "Personalized", leadId: lead.id };
    }
);

import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY || "fallback_for_build");

export const senderProcess = inngest.createFunction(
    { id: "sender-process" },
    { event: "workflow/lead.send.start" },
    async ({ event, step }) => {
        const { leadId } = event.data;

        const lead = await step.run("load-sequenced-lead", async () => {
            return prisma.lead.findUnique({ where: { id: leadId } });
        });

        if (!lead || lead.status !== "SEQUENCED" || !lead.draftEmail || !lead.email) {
            return { status: "Skipped - Not Sequenced, Missing Draft, or Missing Target Email" };
        }

        // ── Push lead into Instantly campaign ──────────────────────────────────
        // Instantly handles warm-up rotation, sending windows, and deliverability.
        // The personalized draft from GPT-4o is injected as a custom variable
        // so the Instantly sequence template can use {{custom_email_body}}.
        const sendResult = await step.run("push-to-instantly", async () => {
            const apiKey = process.env.INSTANTLY_API_KEY;
            const campaignId = process.env.INSTANTLY_CAMPAIGN_ID;

            if (!apiKey) throw new Error("Missing INSTANTLY_API_KEY env var");
            if (!campaignId) throw new Error("Missing INSTANTLY_CAMPAIGN_ID env var");

            const payload = {
                campaign_id: campaignId,
                leads: [
                    {
                        email: lead.email,
                        first_name: lead.name?.split(" ")[0] ?? "",
                        last_name: lead.name?.split(" ").slice(1).join(" ") ?? "",
                        company_name: lead.company ?? "",
                        personalization: lead.draftEmail ?? "",   // Maps to {{personalization}} in Instantly template
                        custom_variables: {
                            title: lead.title ?? "",
                            linkedin_url: lead.linkedinUrl ?? "",
                            career_trigger: lead.careerTrigger ?? "",
                        },
                    },
                ],
                skip_if_in_workspace: true,   // Don't re-add existing contacts
            };

            const res = await fetch("https://api.instantly.ai/api/v2/leads/add", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Instantly API error ${res.status}: ${err}`);
            }

            const data = await res.json();
            return { success: true, response: data };
        });

        // Update CRM status to SENT
        await step.run("mark-as-sent", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: "SENT" }
            });
        });

        return { status: "Pushed to Instantly", leadId: lead.id, result: sendResult.response };
    }
);

export const replyGuardianProcess = inngest.createFunction(
    { id: "reply-guardian-process" },
    { event: "workflow/lead.reply.received" },
    async ({ event, step }) => {
        const { replyId, leadId } = event.data;

        const replyData = await step.run("load-reply-and-lead", async () => {
            const lead = await prisma.lead.findUnique({ where: { id: leadId } });
            const reply = await prisma.reply.findUnique({ where: { id: replyId } });
            return { lead, reply };
        });

        if (!replyData.lead || !replyData.reply) {
            return { status: "Skipped - Missing DB records" };
        }

        const { classification } = await step.run("classify-reply", async () => {
            const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
            const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;

            const systemPrompt = `You are an expert sales reply classifier.
Classify the following email reply into exactly one of these categories:
"Interested", "Curious", "Not now", "Not a fit", "Unsubscribe", "Out of office", "Ambiguous".
Output ONLY the category name.`;

            if (!apiKey) return { classification: "Unclassified (Missing API Key)" };
            const { createOpenAI } = require('@ai-sdk/openai');
            const customOpenai = createOpenAI({ apiKey });

            const { text } = await generateText({
                model: customOpenai("gpt-4o"),
                system: systemPrompt,
                prompt: replyData.reply?.content || ""
            });

            return { classification: text.trim() };
        });

        await step.run("update-reply-and-lead", async () => {
            await prisma.reply.update({
                where: { id: replyId },
                data: { classification }
            });

            // Update Lead status based on reply
            // @ts-ignore
            let newStatus = "REPLIED";
            if (classification === "Unsubscribe" || classification === "Not a fit") {
                newStatus = "SUPPRESSED";
            }

            await prisma.lead.update({
                where: { id: leadId },
                // @ts-ignore
                data: { status: newStatus as any }
            });
        });

        // HITL alert — send Kelsey an email for hot replies so she can respond within 15 min
        await step.run("notify-human", async () => {
            const hotReplyClassifications = ["Interested", "Curious", "Ambiguous"];
            if (!hotReplyClassifications.includes(classification)) return;

            const lead = replyData.lead!;
            const reply = replyData.reply!;

            // Generate a short AI draft reply for Kelsey to edit and send
            const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
            const openAiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;
            const resendKey = settings?.resendApiKey || process.env.RESEND_API_KEY;

            if (!resendKey) {
                console.error("[HITL] No Resend API key — skipping HITL alert");
                return;
            }

            let draftReply = "(Draft generation failed — reply manually)";
            if (openAiKey) {
                try {
                    const { createOpenAI } = require('@ai-sdk/openai');
                    const customOpenai = createOpenAI({ apiKey: openAiKey });
                    const { text } = await generateText({
                        model: customOpenai("gpt-4o"),
                        system: `You are writing a short reply on behalf of Kelsey Stuart, franchise advisor.
The prospect has replied to a cold email. Write a 40–60 word follow-up reply in Kelsey's voice:
calm, direct, no pressure, peer-to-peer tone. Suggest a short call or offer to send times.
No em dashes. No exclamation points. No marketing language. Sign off as "Kelsey".`,
                        prompt: `Prospect name: ${lead.name}
Their reply: ${reply.content}
Classification: ${classification}
Write Kelsey's follow-up reply.`
                    });
                    draftReply = text.trim();
                } catch (err) {
                    console.error("[HITL] Draft generation failed:", err);
                }
            }

            const urgencyLabel = classification === "Interested" ? "🔥 INTERESTED" : classification === "Curious" ? "👀 CURIOUS" : "💬 AMBIGUOUS";

            await resend.emails.send({
                from: "Waypoint System <hi@waypointfranchise.com>",
                to: ["kelsey@waypointfranchise.com"],
                subject: `${urgencyLabel} reply from ${lead.name} — respond within 15 min`,
                text: [
                    `HOT REPLY ALERT — ${classification.toUpperCase()}`,
                    ``,
                    `Lead: ${lead.name}`,
                    `Title: ${lead.title || "N/A"}`,
                    `Company: ${lead.company || "N/A"}`,
                    `LinkedIn: ${lead.linkedinUrl || "N/A"}`,
                    `Score: ${lead.score}`,
                    ``,
                    `─────────────────────────`,
                    `THEIR REPLY:`,
                    reply.content,
                    `─────────────────────────`,
                    ``,
                    `AI DRAFT (edit and send from your inbox):`,
                    draftReply,
                    `─────────────────────────`,
                    ``,
                    `After you reply, send them your TidyCal link:`,
                    `https://tidycal.com/m7v2jox/franchise-consultation`,
                ].join("\n"),
            });

            // Slack push notification — instant alert to phone via #waypoint-hot-replies
            const slackWebhook = process.env.SLACK_WEBHOOK_URL;
            if (slackWebhook) {
                try {
                    await fetch(slackWebhook, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: `${urgencyLabel} — *${lead.name}* replied to your cold email`,
                            blocks: [
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `${urgencyLabel} *${lead.name}* replied — respond within 15 min\n*Title:* ${lead.title || "N/A"}  |  *Company:* ${lead.company || "N/A"}\n*LinkedIn:* ${lead.linkedinUrl || "N/A"}`
                                    }
                                },
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `*Their reply:*\n>${reply.content.replace(/\n/g, "\n>")}`
                                    }
                                },
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `*AI draft:*\n>${draftReply.replace(/\n/g, "\n>")}`
                                    }
                                },
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `Full context + draft in your email inbox. TidyCal: https://tidycal.com/m7v2jox/franchise-consultation`
                                    }
                                }
                            ]
                        }),
                    });
                    console.log(`[HITL] Slack alert sent for ${lead.name}`);
                } catch (err) {
                    console.error("[HITL] Slack notification failed:", err);
                }
            }

            console.log(`[HITL] Alert sent to Kelsey for ${lead.name} (${classification})`);
        });

        return { status: "Processed", classification };
    }
);

// ─── Daily Warm-up Scheduler ──────────────────────────────────────────────────
// Runs each morning, picks top-scored SEQUENCED leads, pushes them to Instantly.
// Volume is controlled by SystemSettings.maxSendsPerDay (admin-panel configurable).
// Set to 15–20 during warm-up, scale to 50 after 4+ weeks of clean metrics.

export const warmupScheduler = inngest.createFunction(
    { id: "warmup-scheduler", retries: 1 },
    { cron: "0 14 * * 1-5" }, // 8 AM Mountain Time (UTC-6), Mon–Fri only
    async ({ step }) => {
        // Load the daily send cap from SystemSettings
        const settings = await step.run("load-settings", async () => {
            return prisma.systemSettings.findUnique({ where: { id: "singleton" } });
        });

        const dailyCap = settings?.maxSendsPerDay ?? 15; // Default 15 during warm-up

        // Pull top-scored SEQUENCED leads (best leads go first)
        const leads = await step.run("load-sequenced-leads", async () => {
            return prisma.lead.findMany({
                where: { status: "SEQUENCED" },
                orderBy: { score: "desc" },
                take: dailyCap,
                select: { id: true, score: true, name: true },
            });
        });

        if (leads.length === 0) {
            return { status: "No leads ready to send", cap: dailyCap };
        }

        // Fire send events with a 90-second stagger to avoid API bursts
        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            await step.sendEvent(`queue-lead-${lead.id}`, {
                name: "workflow/lead.send.start",
                data: { leadId: lead.id },
            });

            // 90s stagger between dispatches — Instantly throttles internally too
            if (i < leads.length - 1) {
                await step.sleep(`stagger-${i}`, "90s");
            }
        }

        return {
            status: "Scheduled",
            sent: leads.length,
            cap: dailyCap,
            leads: leads.map(l => ({ id: l.id, score: l.score, name: l.name })),
        };
    }
);

export const monitorProcess = inngest.createFunction(
    { id: "monitor-process" },
    { cron: "0 9 * * *" }, // Run every day at 9 AM
    async ({ step }) => {
        const stats = await step.run("fetch-resend-stats", async () => {
            // Mocking fetching domain reputation and bounce stats
            // e.g. await resend.domains.get("waypointfranchising.com")
            return {
                bounceRate: Math.random() * 5, // mock 0-5%
                complaintRate: Math.random() * 0.5, // mock 0-0.5%
            };
        });

        await step.run("evaluate-health", async () => {
            if (stats.bounceRate > 2.0 || stats.complaintRate >= 0.3) {
                // Alert Slack / Pause Sending
                console.error(`[CRITICAL] Domain health failing! Bounce: ${stats.bounceRate.toFixed(1)}%, Complaints: ${stats.complaintRate.toFixed(2)}%`);
                // Here we could update a Global Settings DB to pause the "senderProcess"
            } else {
                console.log(`[OK] Domain health stable. Bounce: ${stats.bounceRate.toFixed(1)}%`);
            }
        });

        return { status: "Monitored", stats };
    }
);

// ─── Content Refresh Function ─────────────────────────────────────────────────

import matter from "gray-matter";
import {
    getAllArticles,
    isStale,
    passesComplianceCheck,
} from "@/lib/contentRefresh";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/contentRefreshPrompt";
import { commitRefreshedArticles, ArticleCommitPayload } from "@/lib/githubArticleCommit";

const NOTIFY_EMAIL = "kelsey@waypointfranchise.com";

export const contentRefreshFunction = inngest.createFunction(
    {
        id: "content-refresh",
        // Retry once on failure — prevents hammering OpenAI on partial failures
        retries: 1,
        // Allow up to 10 minutes for large article batches
        timeouts: { finish: "10m" },
    },
    // Runs on the 1st of every month at 8 AM Mountain Time (14:00 UTC)
    // To trigger manually: send event "content/refresh.run" with { force: true }
    [
        { cron: "0 14 1 * *" },
        { event: "content/refresh.run" },
    ],
    async ({ event, step }) => {
        // Support a manual force-run that bypasses the staleness check
        const force = (event as any)?.data?.force === true;

        // ── Step 1: Load all articles ─────────────────────────────────────────
        const articles = await step.run("load-all-articles", async () => {
            return getAllArticles();
        });

        // ── Step 2: Identify stale articles ───────────────────────────────────
        const staleArticles = await step.run("identify-stale", async () => {
            return articles.filter((a) => isStale(a, force));
        });

        if (staleArticles.length === 0) {
            return { status: "No articles due for refresh", total: articles.length };
        }

        const refreshed: string[] = [];
        const failed: { slug: string; reason: string }[] = [];
        const toCommit: ArticleCommitPayload[] = [];

        // ── Step 3: Rewrite each stale article with GPT-4o ────────────────────
        for (const article of staleArticles) {
            const result = await step.run(`refresh-${article.slug}`, async () => {
                const settings = await prisma.systemSettings.findUnique({
                    where: { id: "singleton" }
                });
                const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;
                if (!apiKey) throw new Error("Missing OpenAI API Key");

                const { createOpenAI } = require("@ai-sdk/openai");
                const customOpenai = createOpenAI({ apiKey });

                const { text } = await generateText({
                    model: customOpenai("gpt-4o"),
                    system: buildSystemPrompt(articles.map((a) => a.slug)),
                    prompt: buildUserPrompt(article),
                });

                // Parse the AI response — it should be a complete .md file
                const parsed = matter(text);
                const newFrontmatter = parsed.data as typeof article.frontmatter;
                const newBody = parsed.content;

                // Safety guard: ensure relatedSlugs are preserved
                newFrontmatter.relatedSlugs = article.frontmatter.relatedSlugs;
                newFrontmatter.slug = article.frontmatter.slug;
                newFrontmatter.category = article.frontmatter.category;
                newFrontmatter.tier = article.frontmatter.tier;

                // Compliance check before writing
                const { passes, violations } = passesComplianceCheck(newBody);
                if (!passes) {
                    return {
                        success: false as const,
                        reason: `Compliance violations found: ${violations.join(", ")}`,
                        frontmatter: null,
                        body: null,
                    };
                }

                return { success: true as const, reason: undefined as string | undefined, frontmatter: newFrontmatter, body: newBody };
            });

            if (result.success && result.frontmatter && result.body) {
                refreshed.push(article.slug);
                toCommit.push({
                    slug: article.slug,
                    frontmatter: result.frontmatter,
                    body: result.body,
                });
            } else {
                failed.push({ slug: article.slug, reason: result.reason ?? "Unknown error" });
            }
        }

        // ── Step 4: Commit all refreshed articles to GitHub (single atomic commit) ──
        if (toCommit.length > 0) {
            await step.run("commit-to-github", async () => {
                await commitRefreshedArticles(toCommit);
            });
        }

        // ── Step 5: Send summary email via Resend ─────────────────────────────
        await step.run("send-refresh-summary", async () => {
            const settings = await prisma.systemSettings.findUnique({
                where: { id: "singleton" }
            });
            const apiKey = settings?.resendApiKey || process.env.RESEND_API_KEY;
            if (!apiKey) {
                console.warn("[content-refresh] No Resend API key — skipping summary email");
                return;
            }

            const client = new Resend(apiKey);
            const today = new Date().toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric"
            });
            const runType = force ? "Manual force-run" : "Scheduled monthly run";

            const bodyLines = [
                `Content Refresh Summary — ${today}`,
                `Run type: ${runType}`,
                "",
                `✅ Refreshed (${refreshed.length}):`,
                ...refreshed.map((s) => `  • ${s}`),
                "",
                failed.length > 0
                    ? `❌ Failed (${failed.length}):\n${failed.map((f) => `  • ${f.slug}: ${f.reason}`).join("\n")}`
                    : "No failures.",
                "",
                `⏭ Skipped (strategic/not due): ${articles.length - staleArticles.length} articles`,
            ];

            await client.emails.send({
                from: "Waypoint System <hi@waypointfranchise.com>",
                to: [NOTIFY_EMAIL],
                subject: `Content Refresh: ${refreshed.length} articles updated — ${today}`,
                text: bodyLines.join("\n"),
            });
        });

        return {
            status: "Complete",
            refreshed: refreshed.length,
            failed: failed.length,
            skipped: articles.length - staleArticles.length,
            slugs: refreshed,
        };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// TidyCal Booking Sync
// Runs daily Mon–Fri. Polls TidyCal's REST API for bookings in the last 2 days
// and updates matched leads to REPLIED status.
// TidyCal does not support native outbound webhooks on the Individual plan —
// polling is the reliable alternative.
// ─────────────────────────────────────────────────────────────────────────────

type TidyCalBooking = {
    id: number;
    cancelled_at: string | null;
    starts_at: string;
    contact?: {
        email?: string;
        name?: string;
    };
};

export const tidycalBookingSync = inngest.createFunction(
    { id: "tidycal-booking-sync", retries: 2 },
    { cron: "0 16 * * 1-5" }, // 10 AM Mountain Time (UTC-6), Mon–Fri
    async ({ step }) => {

        // ── Step 1: Fetch bookings from TidyCal API ──────────────────────────
        const bookings = await step.run("fetch-tidycal-bookings", async () => {
            const apiKey = process.env.TIDYCAL_API_KEY;
            if (!apiKey) throw new Error("[tidycal-sync] TIDYCAL_API_KEY is not set");

            // 2-day lookback handles timezone drift and missed runs
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            const startsAt = twoDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD

            const res = await fetch(
                `https://tidycal.com/api/bookings?starts_at=${startsAt}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        Accept: "application/json",
                    },
                }
            );

            if (!res.ok) {
                throw new Error(`[tidycal-sync] API error ${res.status}: ${await res.text()}`);
            }

            const data = await res.json();
            return (data.data || []) as TidyCalBooking[];
        });

        // Filter out cancelled bookings
        const activeBookings = bookings.filter(b => !b.cancelled_at);

        if (activeBookings.length === 0) {
            return { status: "No active bookings in 2-day window", matched: 0, unmatched: 0 };
        }

        // ── Step 2: Match each booking to a lead and update status ───────────
        const results = await Promise.all(
            activeBookings.map(booking =>
                step.run(`sync-booking-${booking.id}`, async () => {
                    const email = booking.contact?.email;
                    if (!email) return { matched: false, reason: "no email on booking" };

                    const lead = await prisma.lead.findFirst({
                        where: { email },
                        orderBy: { updatedAt: "desc" },
                    });

                    if (!lead) {
                        console.log(`[tidycal-sync] No lead found for: ${email}`);
                        return { matched: false, email, reason: "no matching lead" };
                    }

                    // Don't overwrite already-booked or suppressed leads
                    if (["BOOKED", "SUPPRESSED"].includes(lead.status)) {
                        return { matched: false, email, reason: `already ${lead.status}` };
                    }

                    await prisma.lead.update({
                        where: { id: lead.id },
                        // @ts-ignore — BOOKED added to schema; migration runs on next Vercel deploy
                        data: { status: "BOOKED" as any },
                    });

                    console.log(`[tidycal-sync] ✅ Booking synced: ${lead.name} (${email})`);
                    return { matched: true, email, leadId: lead.id };
                })
            )
        );

        const matched = results.filter(r => r.matched).length;
        const unmatched = results.filter(r => !r.matched).length;

        return {
            status: "Complete",
            total: activeBookings.length,
            matched,
            unmatched,
        };
    }
);
