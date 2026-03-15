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

            // ── Email discovery (TODO: replace with ZeroBounce/Hunter.io API) ──
            // Placeholder: construct a likely email from name + company domain
            const guessedEmail = lead.email ||
                `${lead.name.replace(/\s+/g, '.').toLowerCase()}@${(lead.company || "unknown").toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`;

            return { email: guessedEmail, rawScore: score };
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

import { PROHIBITED_PHRASES, EMAIL_TEMPLATES } from "@/lib/templates";

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

            // System prompt mimicking the exact requirements
            const systemPrompt = `You are the Waypoint Franchise Advisors "Personalizer Agent".
Your goal is to write a highly personalized, human-feeling cold email to a corporate professional.

CORE RULES:
1. Email length: 50-90 words. Shorter is always better.
2. Context slots: You must fill at least TWO context slots based on the provided lead data.
3. Tone & EQ Strategy (MANDATORY): Use NLP "Pacing and Leading" (validate their exact emotional or career state right now before introducing any new idea). Focus on "Identity-level framing" ("people who build things" instead of "you should buy a business"). Demonstrate deep empathy without pity. Peer-to-peer respect, colloquial, slightly informal. Talk like a busy executive typing from a phone.
4. Structure:
   - Empathetic opener validating their specific trigger/post directly (no pleasantries).
   - Pacing & Leading: Name the unspoken reality or frustration of their current corporate path.
   - Identity shift: Introduce the transition to ownership as a viable option for "people like them" (autonomy, equity).
   - Soft, zero-pressure exit ("bookmark this for later", "no pitch").

PROHIBITED PHRASES:
\${PROHIBITED_PHRASES.join(", ")}
AND NO em dashes (—). NO exclamation points (!). AND NO starting three sentences in a row with "I" or "Most".
Avoid sounding overly enthusiastic. Keep punctuation minimal and professional.

Choose the closest template to start with, and modify heavily for the user:
${EMAIL_TEMPLATES}
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
        await step.run("save-draft-email", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    draftEmail,
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

        // Mock checking warmup caps / interval randomness
        await step.sleep("random-interval-delay", `${Math.floor(Math.random() * 5) + 3}m`); // 3-8 minute random interval target

        // Send via Resend
        const sendResult = await step.run("send-via-resend", async () => {
            try {
                const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
                const apiKey = settings?.resendApiKey || process.env.RESEND_API_KEY;
                if (!apiKey) throw new Error("Missing Resend API Key in Settings");

                const client = new Resend(apiKey);

                const { data, error } = await client.emails.send({
                    from: "Jake <jake@waypointfranchising.com>", // To be parameterized
                    to: [lead.email!],
                    subject: "Exploring franchise paths", // To be generated or A/B tested
                    // @ts-ignore - draftEmail is added in the updated Prisma client but TS language server may be cached
                    text: lead.draftEmail!,
                    headers: {
                        "List-Unsubscribe": "<mailto:unsubscribe@waypointfranchising.com>"
                    }
                });

                if (error) throw new Error(error.message);
                return { success: true, resendId: data?.id ?? null, error: null };
            } catch (err: any) {
                return { success: false, resendId: null, error: err.message };
            }
        });

        if (!sendResult.success) {
            // Handle failure scenario, possibly marking as SUPPRESSED or retrying
            return { status: "Failed", error: sendResult.error };
        }

        // Update DB
        await step.run("mark-as-sent", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: "SENT" }
            });
        });

        return { status: "Sent", resendId: sendResult.resendId };
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

        // Slack/Gmail integration mock
        await step.run("notify-human", async () => {
            if (["Interested", "Curious", "Ambiguous"].includes(classification)) {
                // e.g. await fetch("slack-webhook-url", { ... })
                console.log(`[ALERT] High intent reply from ${replyData.lead?.name}! Classification: ${classification}`);
            }
        });

        return { status: "Processed", classification };
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
