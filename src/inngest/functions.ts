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

            // ── Title / Seniority (up to +18) ─────────────────────────────────
            // C-suite trimmed: equity/prestige reduces burnout-readiness vs Director/VP.
            // Director is the sweet spot — enough stature, enough grind, enough golden handcuffs.
            const title = (lead.title || "").toLowerCase();
            if (/\b(ceo|coo|cfo|cto|cmo|chro|chief)\b/i.test(title)) {
                score += 15;
            } else if (/\bsvp\b|\bvp\b|vice president/i.test(title)) {
                score += 18;
            } else if (/\bdirector\b/i.test(title)) {
                score += 15;
            } else if (/\bsenior manager\b|\bprincipal\b/i.test(title)) {
                score += 12;
            } else if (/\bmanager\b/i.test(title)) {
                score += 5;
            }

            // ── Career Trigger Signal (up to +20) ─────────────────────────────
            // FIX: promotion/new role signals the WRONG direction — someone who just started
            // a fresh chapter is LESS likely to buy a franchise. Demoted to +3.
            // New bucket: long-term dissatisfaction signals (burnout, plateau, stuck) = +15.
            const trigger = (lead.careerTrigger || "").toLowerCase();
            if (trigger) {
                if (/layoff|laid off|job loss|let go|shut down|what.s next|exploring next|between roles/i.test(trigger)) {
                    score += 20; // Acute catalyst — highest urgency
                } else if (/burnout|burned out|plateau|golden handcuff|stuck|trapped|tired of|corporate|exploring|ready for something new/i.test(trigger)) {
                    score += 15; // Chronic dissatisfaction — strong ICP signal
                } else if (/promotion|new role|just started|relocated|franchise|entrepreneurship|ownership/i.test(trigger)) {
                    score += 3; // Wrong direction — just refreshed career, low readiness
                } else {
                    score += 3; // trigger present but generic
                }
            }

            // ── Company News Event (up to +20) — Priority A signal ────────────────
            // A macro public event (WARN Act, layoff, reorg) is the strongest ICP
            // signal: target still employed, transition mindset active, capital arriving.
            // Previously this only gated the quality check — now it scores too.
            const newsEvent = ((lead as any).companyNewsEvent as string | undefined ?? "").toLowerCase();
            if (newsEvent) {
                if (/warn|layoff|laid off|reduction in force|rif|job cut|headcount|downsiz|restructur/i.test(newsEvent)) {
                    score += 20; // WARN Act / mass layoff — highest urgency ICP signal
                } else if (/reorg|reorgani|acqui|merger|spin.?off|divest|leadership change|ceo depart|shut down|office clos/i.test(newsEvent)) {
                    score += 10; // Structural change — career uncertainty, moderate signal
                } else {
                    score += 5;  // Company in news — any signal beats none
                }
            }

            // ── LinkedIn Post Content (up to +8) ──────────────────────────────────
            // Executives don't vent on LinkedIn. Score realistic professional language:
            // "next chapter", "open to", "exploring" — not burnout keywords.
            const post = (lead.recentPostSummary || "").toLowerCase();
            if (post) {
                if (/next chapter|exciting next|open to|exploring|what.s next|new opportunity|transition|ready for something|time to reflect|taking stock|considering|evaluating|pivot/i.test(post)) {
                    score += 8;  // Career transition signal — professional phrasing
                } else if (/burnout|burned out|autonomy|ownership|side business|w-?2|golden handcuff|corporate grind|tired of|had enough|escape/i.test(post)) {
                    score += 8;  // Explicit signal — rare on LinkedIn but keep it
                } else {
                    score += 5;  // Active on LinkedIn = valid personalization hook
                }
            }

            // ── Persona Fit Bonus (up to +8) ──────────────────────────────────
            // Enterprise companies = higher W2, slower career velocity, more golden handcuffs.
            const company = (lead.company || "").toLowerCase();
            if (company) {
                const enterprise = ["microsoft", "amazon", "google", "meta", "apple", "salesforce", "oracle", "ibm", "deloitte", "accenture", "mckinsey", "jpmorgan", "chase", "bank of america", "wells fargo", "boeing", "ge ", "general electric", "att", "at&t", "verizon"];
                const isFortune500 = enterprise.some(e => company.includes(e));
                if (isFortune500) {
                    score += 8; // Enterprise slow-movers = higher burnout likelihood
                } else if (company.length > 2) {
                    score += 3; // any named company is better than unknown
                }
            }

            // ── Tenure Signal (up to +20) ─────────────────────────────────────
            // Source: Nemo (2025) — long tenure = golden handcuffs, plateau, burnout readiness.
            // This is the PRIMARY ICP signal — weighted accordingly.
            // IMPORTANT: This field is NEVER passed to the email generator. Scoring use only.
            const tenureYears = (lead as any).yearsInCurrentRole as number | null | undefined;
            if (tenureYears && tenureYears >= 8) {
                score += 20; // Core ICP — 8+ years = high burnout-readiness
            } else if (tenureYears && tenureYears >= 5) {
                score += 10; // Solid tenure — worth pursuing
            }

            // Cap at 100
            if (score > 100) score = 100;

            // ── Email ─────────────────────────────────────────────────────────
            // Evaboot exports are email-verified, so lead.email is almost always set.
            // If not, construct a best-guess and cap score at 50 — it cannot clear
            // the 70-pt gate and won't be sent. Clay upstream handles true enrichment.
            let foundEmail: string | null = lead.email || null;
            if (!foundEmail) {
                const nameParts = lead.name.trim().split(/\s+/);
                foundEmail = `${nameParts[0]?.toLowerCase()}.${nameParts.slice(1).join("").toLowerCase()}@${(lead.company || "unknown").toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.com`;
                score = Math.min(score, 50);
            }

            return { email: foundEmail, rawScore: score };
        });

        if (rawScore < 50) {
            await step.run("mark-suppressed-or-ignored", async () => {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { status: "SUPPRESSED", score: rawScore, email }
                });
            });
            return { status: "Skipped - Score too low", score: rawScore };
        }

        await step.run("update-to-enriched", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: "ENRICHED", score: rawScore, email }
            });
        });

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

        // ── Quality Gate ──────────────────────────────────────────────────────
        // Priority A = company news event (macro, public — WARN Act, 8-K, reorg, layoffs).
        // Priority B = paraphrase of LinkedIn post topic (never verbatim — topic only).
        // Clay is the automated enrichment path that populates these fields upstream.
        // A generic email performs WORSE than no email for skeptical executives.
        const companyNewsEvent  = ((lead as any).companyNewsEvent as string | undefined)?.trim() ?? "";
        const recentPostSummary = (lead.recentPostSummary ?? "").trim();
        const hasHighAuthToken  = !!(companyNewsEvent || recentPostSummary);

        if (!hasHighAuthToken) {
            return { status: "HELD — No personalization signal. Clay enrichment will auto-release this lead." };
        }

        const { draftEmail } = await step.run("generate-personalized-email", async () => {
            const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
            const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;

            if (!apiKey) throw new Error("Missing OpenAI API Key in Settings");

            const firstName = lead.name.trim().split(/\s+/)[0];

            // By the time we reach here, the quality gate has guaranteed hasHighAuthToken is true.
            // Priority A beats Priority B. Only one signal used in the email body.
            const primarySignal = companyNewsEvent || recentPostSummary;
            const signalType = companyNewsEvent
                ? "Priority A: company news event (macro, public \u2014 WARN Act, 8-K, reorg, layoffs)"
                : "Priority B: paraphrase of LinkedIn post topic (never verbatim \u2014 topic only)";

            const systemPrompt = `You are the Waypoint Franchise Advisors "Personalizer Agent".
Your ONLY goal is to write ONE cold email that generates a single reply from a highly skeptical corporate executive.

${VOICE_RULES}

PROHIBITED PHRASES \u2014 never use any of these:
${PROHIBITED_PHRASES.join(", ")}
AND: NO em dashes (\u2014). NO exclamation points. NO starting 3 consecutive sentences with "I" or "Most".

PERSONALIZATION RULES \u2014 mandatory:
- Use EXACTLY 1 signal in the email body (provided below as the Personalization Signal).
- NEVER verbatim-quote the prospect's own words. Paraphrase the topic only, no quotation marks.
- NEVER state the logical connection between the signal and the pitch. The reader makes that connection.
- NEVER reference: tenure, city, location, college, graduation year, hobbies, passive LinkedIn activity (likes/comments).

TEMPLATE REFERENCE \u2014 rotate structure per email:
${EMAIL_TEMPLATES}

FINAL CHECK: 50\u201390 words total. Opens with the signal \u2014 never with flattery, never with a greeting. One CTA only. Closes with low pressure. Plain text only.
`;

            const userPrompt = `Prospect:
Name: ${lead.name}
First name: ${firstName}
Title: ${lead.title || "Executive"}
Company: ${lead.company || "their company"}
Career Trigger Type: ${lead.careerTrigger || ""}
Franchise Angle (internal context \u2014 do not reference directly): ${lead.franchiseAngle || ""}

Personalization Signal:
Type: ${signalType}
Signal: ${primarySignal}

Write the email. Plain text only. No markdown. No quotes around the email.`;

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
                    ``,
                    `═════════════════════════`,
                    `30-DAY GHOST RECOVERY KIT (save for if this lead goes quiet)`,
                    `═════════════════════════`,
                    `If ${lead.name} stops responding after your first exchange, send one of these:`,
                    ``,
                    `Option A (direct re-engagement):`,
                    `  "${lead.name.split(" ")[0]} — are you doing this?"`,
                    ``,
                    `Option B (no-oriented question, Chris Voss):`,
                    `  "Have you given up on franchise ownership?"`,
                    ``,
                    `Send as a standalone 1-sentence LinkedIn DM or email reply. Nothing else.`,
                    `Only use after 30+ days of silence.`,
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

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn DM Queue
// Runs Mon–Fri at 9 AM MT. Finds leads that have been in SENT status for 5+
// days with no reply and posts a Slack summary to #waypoint-hot-replies with
// copy-paste LinkedIn DM scripts for each. Automated trigger, manual delivery
// (LinkedIn DM automation violates ToS — this is the practical equivalent).
// ─────────────────────────────────────────────────────────────────────────────

export const linkedInDmQueue = inngest.createFunction(
    { id: "linkedin-dm-queue", retries: 1 },
    { cron: "0 15 * * 1-5" }, // 9 AM Mountain Time (UTC-6), Mon–Fri
    async ({ step }) => {
        const staleLeads = await step.run("find-stale-sent-leads", async () => {
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

            return prisma.lead.findMany({
                where: {
                    status: "SENT",
                    updatedAt: { lte: fiveDaysAgo },
                },
                orderBy: { score: "desc" },
                take: 20, // Cap at 20 per day to keep the list actionable
                select: { id: true, name: true, title: true, company: true, linkedinUrl: true, score: true },
            });
        });

        if (staleLeads.length === 0) {
            console.log("[linkedin-dm-queue] No stale SENT leads today.");
            return { status: "No stale leads", count: 0 };
        }

        await step.run("post-linkedin-dm-queue-to-slack", async () => {
            const slackWebhook = process.env.SLACK_WEBHOOK_URL;
            if (!slackWebhook) {
                console.warn("[linkedin-dm-queue] No SLACK_WEBHOOK_URL — skipping alert");
                return;
            }

            const leadBlocks = staleLeads.map(lead => ({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: [
                        `*${lead.name}* | ${lead.title || "N/A"} @ ${lead.company || "N/A"} | Score: ${lead.score}`,
                        lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : "No LinkedIn URL",
                        `📋 DM script: _"Hi ${lead.name.split(" ")[0]} — can I send you a free copy of my guide, "5 Things That Actually Determine If Franchise Ownership Makes Sense For You"?"_`,
                    ].join("\n"),
                },
            }));

            await fetch(slackWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `📬 LinkedIn DM Queue — ${staleLeads.length} lead${staleLeads.length !== 1 ? "s" : ""} need a LinkedIn touch today`,
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `📬 LinkedIn DM Queue — ${staleLeads.length} lead${staleLeads.length !== 1 ? "s" : ""} (5+ days SENT, no reply)`,
                            },
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "These leads were emailed 5+ days ago and haven't replied. Send each a 1-sentence LinkedIn DM using the script below each name. Copy-paste ready.",
                            },
                        },
                        ...leadBlocks,
                        {
                            type: "context",
                            elements: [
                                {
                                    type: "mrkdwn",
                                    text: "After they say yes to the guide, personalize your follow-up based on their LinkedIn profile. Qualify first, personalize second.",
                                },
                            ],
                        },
                    ],
                }),
            });

            console.log(`[linkedin-dm-queue] Slack alert sent — ${staleLeads.length} leads queued`);
        });

        return { status: "Sent", count: staleLeads.length };
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Ghost Recovery Alert
// Runs every Monday at 10 AM MT. Finds leads with Curious or Ambiguous
// classification that replied 30+ days ago and still haven't booked.
// Posts ghost recovery scripts (Nemo 2025) to Slack for Kelsey to deploy.
// ─────────────────────────────────────────────────────────────────────────────

export const ghostRecoveryAlert = inngest.createFunction(
    { id: "ghost-recovery-alert", retries: 1 },
    { cron: "0 16 * * 1" }, // 10 AM Mountain Time (UTC-6), Monday only
    async ({ step }) => {
        const ghostedLeads = await step.run("find-ghosted-warm-leads", async () => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Warm leads (REPLIED) that went quiet 30+ days ago without booking
            const leads = await prisma.lead.findMany({
                where: {
                    status: "REPLIED",
                    updatedAt: { lte: thirtyDaysAgo },
                },
                orderBy: { score: "desc" },
                take: 15,
                select: { id: true, name: true, title: true, company: true, linkedinUrl: true, score: true, updatedAt: true },
            });

            // Cross-reference: only return leads whose most recent Reply classification was Curious or Ambiguous
            const filtered = await Promise.all(
                leads.map(async (lead) => {
                    const latestReply = await prisma.reply.findFirst({
                        where: { leadId: lead.id },
                        orderBy: { createdAt: "desc" },
                        select: { classification: true },
                    });
                    const isColdable = ["Curious", "Ambiguous", "Not now"].includes(latestReply?.classification ?? "");
                    return isColdable ? { ...lead, classification: latestReply?.classification } : null;
                })
            );

            return filtered.filter(Boolean) as typeof leads;
        });

        if (ghostedLeads.length === 0) {
            console.log("[ghost-recovery-alert] No ghosted warm leads this week.");
            return { status: "No ghosted leads", count: 0 };
        }

        await step.run("post-ghost-recovery-to-slack", async () => {
            const slackWebhook = process.env.SLACK_WEBHOOK_URL;
            if (!slackWebhook) {
                console.warn("[ghost-recovery-alert] No SLACK_WEBHOOK_URL — skipping alert");
                return;
            }

            const leadBlocks = ghostedLeads.map(lead => ({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: [
                        `*${lead.name}* | ${lead.title || "N/A"} @ ${lead.company || "N/A"} | Score: ${lead.score}`,
                        lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : "No LinkedIn URL",
                        `Last active: ${new Date(lead.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                        ``,
                        `👻 Ghost Option A: _"${lead.name.split(" ")[0]} — are you doing this?"_`,
                        `👻 Ghost Option B: _"Have you given up on franchise ownership?"_`,
                    ].join("\n"),
                },
            }));

            await fetch(slackWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `👻 Ghost Recovery Alert — ${ghostedLeads.length} warm lead${ghostedLeads.length !== 1 ? "s" : ""} gone quiet for 30+ days`,
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `👻 Ghost Recovery — ${ghostedLeads.length} warm lead${ghostedLeads.length !== 1 ? "s" : ""} silent for 30+ days`,
                            },
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "These leads replied with interest but have gone dark. Pick *one* script per lead and send it as a standalone 1-sentence reply — nothing else attached.",
                            },
                        },
                        ...leadBlocks,
                        {
                            type: "context",
                            elements: [
                                {
                                    type: "mrkdwn",
                                    text: "Only use these after 30+ days of silence. Send as LinkedIn DM or direct email reply. Source: Nemo (2025) + Chris Voss *Never Split the Difference*.",
                                },
                            ],
                        },
                    ],
                }),
            });

            console.log(`[ghost-recovery-alert] Slack alert sent — ${ghostedLeads.length} ghosted leads`);
        });

        return { status: "Sent", count: ghostedLeads.length };
    }
);
