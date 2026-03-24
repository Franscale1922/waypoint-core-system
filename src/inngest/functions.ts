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
                // @ts-ignore — suppressionReason added to schema; Prisma client regenerates on deploy
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { status: "SUPPRESSED", suppressionReason: "non_serviceable_market" } as any,
                });
                return { email: null, rawScore: 0 };
            }

            // ── Base score ────────────────────────────────────────────────────
            let score = 40;

            // ── Title / Seniority (up to +20) ──────────────────────────────────
            // Four-stage pipeline:
            //   1. Franchise ICP — score first, before any suppression check
            //   2. Hard suppress non-franchise owners, founders, freelancers
            //   3. Regex fast path for corporate seniority tiers
            //   4. GPT-4o-mini fallback for any title that scored 0 on regex
            const title = (lead.title || "").toLowerCase();
            let titleBonus = 0;
            let titleMatched = false;

            // ── Stage 1: Franchise ICP (multi-unit expansion candidates) ──────
            // These leads have already proven franchise interest — score them high.
            // Multi-unit/multi-brand operators are the most qualified targets.
            if (/\bmulti[.\s-]?unit\b|\bmulti[.\s-]?brand\b/i.test(title)) {
                titleBonus = 20; titleMatched = true; // Multi-unit operator — top franchise ICP
            } else if (/\bfranchise\s*(owner|operator|partner)\b|\bfranchisee\b/i.test(title)) {
                titleBonus = 18; titleMatched = true; // Single-unit — multi-unit expansion candidate
            }

            // ── Stage 2: Hard suppression (non-franchise owners, founders) ────
            if (!titleMatched) {
                if (/\b(founder|co-founder|business owner|co-owner)\b/i.test(title) ||
                    /\bfreelance\b|\bindependent\s+(consultant|writer|contractor|professional|advisor|coach|creator)\b/i.test(title)) {
                    // @ts-ignore — suppressionReason added to schema; Prisma client regenerates on deploy
                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { status: "SUPPRESSED", suppressionReason: "title_suppressed" } as any,
                    });
                    return { email: null, rawScore: 0 };
                }
            }

            // ── Stage 3: Regex fast path (corporate seniority tiers) ──────────
            if (!titleMatched) {
                if (/\b(ceo|coo|cfo|cto|cmo|chro|chief)\b/i.test(title)) {
                    titleBonus = 15; titleMatched = true; // C-suite
                } else if (/\bsvp\b|\bevp\b|\brvp\b|\bvp\b|vice president|managing director/i.test(title)) {
                    titleBonus = 18; titleMatched = true; // VP / Managing Director tier
                } else if (/\bavp\b|assistant vice president/i.test(title)) {
                    titleBonus = 12; titleMatched = true; // AVP — financial services / banking
                } else if (/\bdirector\b|\bhead of\b|general manager/i.test(title) ||
                           /\bgm\b.*(sales|operations|region|district|market)/i.test(title)) {
                    titleBonus = 15; titleMatched = true; // Director-equivalents
                } else if (/\bpresident\b|\bmanaging partner\b|\bpartner\b|\bprincipal\b|\bsenior manager\b/i.test(title)) {
                    titleBonus = 12; titleMatched = true; // President (division), Partner, Sr. Manager
                } else if (/\bmanager\b/i.test(title)) {
                    titleBonus = 5; titleMatched = true;  // Catch-all: any manager variant
                }
            }

            // ── Stage 4: LLM fallback for unrecognised titles ─────────────────
            // Only fires when regex matched nothing (titleMatched = false).
            // Uses gpt-4o-mini — cheap, fast, semantically robust.
            // Handles: "Exec VP", "Country Lead", "Practice Director", etc.
            if (!titleMatched && title.length > 2) {
                try {
                    const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
                    const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;
                    if (apiKey) {
                        const { createOpenAI } = require("@ai-sdk/openai");
                        const miniModel = createOpenAI({ apiKey })("gpt-4o-mini");
                        const { text } = await generateText({
                            model: miniModel,
                            system: `Classify a LinkedIn job title into one of these seniority tiers.
Reply with ONLY the numeric tier — nothing else.
20 = Multi-unit or multi-brand franchise operator
18 = VP-tier: any Vice President variant (Executive VP, EVP, Exec VP, SVP, RVP, AVP-senior, Managing Director, MD)
15 = Director-tier: any Director, Head of [dept], General Manager, GM (with context), Country/Market Lead
12 = Senior Manager-tier: Senior Manager, Principal, Managing Partner, Partner, President of a division/region
5  = Manager-tier: any manager not covered above (Regional Manager, Account Manager, etc.)
0  = Junior, irrelevant, or self-employed (analyst, coordinator, associate, intern, student, freelancer, owner, founder)`,
                            prompt: `Job title: "${lead.title}"\nTier:`,
                        });
                        const parsed = parseInt(text.trim().split(/\s/)[0], 10);
                        if ([20, 18, 15, 12, 5, 0].includes(parsed)) {
                            titleBonus = parsed;
                        }
                    }
                } catch {
                    // LLM fallback failed silently — title scores 0 bonus, pipeline continues
                }
            }

            score += titleBonus;

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
            } else if (tenureYears && tenureYears >= 3) {
                score += 5;  // Building toward plateau — mild early signal
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
                    // @ts-ignore — suppressionReason added to schema; Prisma client regenerates on deploy
                    data: { status: "SUPPRESSED", score: rawScore, email, suppressionReason: "low_score" }
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

import { PROHIBITED_PHRASES, EMAIL_TEMPLATES, VOICE_RULES, CAN_SPAM_FOOTER, CLOSING_CTAS } from "@/lib/templates";

export const personalizerProcess = inngest.createFunction(
    { id: "personalizer-process" },
    { event: "workflow/lead.personalize.start" },
    async ({ event, step }) => {
        const { leadId } = event.data;

        const lead = await step.run("load-enriched-lead", async () => {
            return prisma.lead.findUnique({ where: { id: leadId } });
        });

        // Allow both ENRICHED (normal pipeline path) and SEQUENCED (manual
        // regeneration path — lead already passed scoring and had an email,
        // but the email is being regenerated with the updated prompt).
        if (!lead || (lead.status !== "ENRICHED" && lead.status !== "SEQUENCED")) {
            return { status: "Skipped - Not Enriched or Not Found" };
        }

        // ── Signal selection (Priority A > B > C) ────────────────────────────────
        // A = company news event. B = LinkedIn post paraphrase. C = ICP fallback.
        // No lead is held — every lead scoring ≥50 gets an email attempt.
        const companyNewsEvent  = ((lead as any).companyNewsEvent as string | undefined)?.trim() ?? "";
        const recentPostSummary = (lead.recentPostSummary ?? "").trim();

        let primarySignal: string;
        let signalType: string;

        // ── Signal quality gate ────────────────────────────────────────────────
        // Priority B (LinkedIn post) is only a valid signal if the post has a
        // career or business-ownership dimension. Posts about politics, charity/
        // volunteer work, purely operational/technical topics, recruiter promo
        // posts, low-signal casual reactions, OR posts about a third-party person
        // (not the prospect's own career perspective) all gate to Priority C.
        const NON_CAREER_SIGNAL_KEYWORDS = [
            // political / government
            "politic", "election", "congress", "senate", "democrat", "republican",
            "president", "legislation", "bill ", "policy", "vote", "tariff", "government",
            "white house", "convince itself", "administration", "executive order",
            "partisan", "geopolit", "sanctions", "trump", "biden", "harris",
            // charity / CSR / volunteer
            "haven house", "nonprofit", "volunteer", "charity", "donate", "fundrais",
            "shelter", "food bank", "awareness", "giveback", "give back",
            "women in construction", "women in stem", "women in tech",
            // purely operational / technical (no career angle)
            "fixed a bug", "server issue", "merged a pr", "pushed to prod",
            // video / media production operational posts
            "video issue", "footage", " render", "upload", "editing", "video fix",
            // recruiter / promotional cheerleading posts (not the prospect's own career voice)
            "exciting times in", "let us help you", "next career step", "we're hiring",
            "we are hiring", "join our team", "help you find", "your next opportunity",
            "reach out to me", "send me a dm", "open to connections",
            // third-party praise / farewell posts (prospect is commenting about someone else leaving)
            "lucky company she chooses", "lucky company he chooses", "lucky company they choose",
            "can't wait to see which", "cant wait to see which",
            "in a class all to herself", "in a class all to himself",
            "so excited for her", "so excited for him", "so excited for them",
            "congratulations to", "congrats to", "wishing her the best", "wishing him the best",
            "she will be missed", "he will be missed", "they will be missed",
            "send her off", "send him off",
            // conference/event attendance logistics — these are social networking posts,
            // not career-state signals. "Looking forward to seeing you at AUSA!" tells
            // us nothing about the prospect's career trajectory. Gate to Priority C.
            "looking forward to seeing", "looking forward to meeting everyone",
            "see you at", "see you in ", "who else is going", "who's going to be at",
            "who's attending", "let's connect at", "find me at", "stop by our booth",
            "drop by and say hello", "heading to ", "will be in ",
            "i'll be at", "i'll be in ", "safe travels",
        ];
        // Keywords are already lowercased; recentPostSummary is also lowercased before comparison
        const postLowercase = recentPostSummary.toLowerCase();
        // Minimum word count gate — casual one-liner social reactions (< 15 words) are
        // not substantive career signals regardless of keyword content.
        const postTooShort = recentPostSummary.trim().split(/\s+/).length < 15;
        // Third-party structural gate — posts that are about someone else's career journey,
        // not the prospect's own perspective. Key pattern: post begins with a named person
        // (possessive or nominative) and describes that person's achievement/departure.
        // Example: "Karen's truly in a class all to herself...Can't wait to see which lucky
        // company she chooses to call home." — David is commenting about Karen, not himself.
        // If we email David referencing Karen, he has zero context for why a stranger is
        // mentioning Karen's name — it feels surveillance-like and confusing.
        const postAboutThirdParty = /^[A-Z][a-z]+'s\s|\bshe('s|\s+is)\b|\bhe('s|\s+is)\b|\bthey('re|\s+are)\b/
            .test(recentPostSummary.trim()) &&
            /lucky company|call home|new chapter|next chapter|next role|new role|next opportunity/i
            .test(recentPostSummary);
        const postLooksNonCareer = recentPostSummary
            ? (NON_CAREER_SIGNAL_KEYWORDS.some(kw => postLowercase.includes(kw)) || postTooShort || postAboutThirdParty)
            : false;

        if (companyNewsEvent) {
            primarySignal = companyNewsEvent;
            signalType = "Priority A: company news event (macro, public — WARN Act, 8-K, reorg, layoffs)";
        } else if (recentPostSummary && !postLooksNonCareer) {
            primarySignal = recentPostSummary;
            signalType = "Priority B: paraphrase of LinkedIn post TOPIC only (never verbatim, never name a third party if the post is about someone else).";
        } else {
            primarySignal = `${lead.title || "Corporate professional"} at ${lead.company || "a major company"}`;
            signalType = `Priority C: ICP-based outreach — NO external signal available.
Open with a golden handcuffs narrative: the prospect has spent years building expertise inside a corporate structure.
Lead with the universal truth of their situation (ceiling, stability trap, income without ownership).
STRICT RULES for Priority C:
- NEVER fabricate a specific hook, event, or industry observation you cannot verify.
- NEVER open with an excited or flattering statement (e.g. 'Exciting times in...', 'Impressive work at...').
- NEVER assume their industry, vertical, or current challenges without evidence.
- The ONLY safe openers are universal truths about corporate career trajectories in general.`;
        }

        const { draftEmail } = await step.run("generate-personalized-email", async () => {
            const settings = await prisma.systemSettings.findUnique({ where: { id: "singleton" } });
            const apiKey = settings?.openAiApiKey || process.env.OPENAI_API_KEY;

            if (!apiKey) throw new Error("Missing OpenAI API Key in Settings");

            const firstName = lead.name.trim().split(/\s+/)[0];

            // ── Deterministic CTA rotation ────────────────────────────────────
            // GPT anchors on "Curious if that's even a thought?" ~80% of the time.
            // We select one of the 3 approved CTAs using a simple char-code hash of
            // the lead's name — reproducible, no DB column needed, guarantees variety
            // across the full lead list without repeating the same phrase in bulk.
            const ctaIndex = lead.name
                .split("")
                .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % CLOSING_CTAS.length;
            const requiredCTA = CLOSING_CTAS[ctaIndex];

            const systemPrompt = `You are the Waypoint Franchise Advisors "Personalizer Agent".
Your ONLY goal is to write ONE cold email that generates a single reply from a highly skeptical corporate executive.

${VOICE_RULES}

PROHIBITED PHRASES — never use any of these:
${PROHIBITED_PHRASES.join(", ")}
AND: NO em dashes (—). NO exclamation points. NO starting 3 consecutive sentences with "I" or "Most".

PROHIBITED AI-SOUNDING VOCABULARY — these words instantly mark the email as machine-generated. Do NOT use them:
delve, landscape, leverage, synergies, pivoting, intersection, tapestry, multifaceted, embark, journey,
realm, navigate, unlock, transform, revolutionize, innovative, cutting-edge, game-changing, thought leader,
visionary, robust, it's clear that, it's evident that, it goes without saying, needless to say,
in today's fast-paced, in today's dynamic, in the ever-evolving, as we move forward.
If you write any of these words or phrases, rewrite that sentence before outputting. No exceptions.

PROHIBITED AI STARTER SENTENCES — never open the email body (the line after "Hi [Name],") with:
"In today...", "As a...", "With the current...", "It's no secret...", "Whether you're...",
"As someone who...", "Given your...", "I came across your...", "I noticed...", "I wanted to reach out",
"I hope this finds you well", "I'm reaching out because".
If your first line after the greeting falls into one of these patterns, delete it and restart.

PERSONALIZATION RULES — mandatory:
- Use EXACTLY 1 signal in the email body (provided below as the Personalization Signal).
- NEVER verbatim-quote the prospect's own words. Paraphrase the topic only, no quotation marks.
- NEVER state the logical connection between the signal and the pitch. The reader makes that connection.
- NEVER reference: tenure, city, location, college, graduation year, hobbies, passive LinkedIn activity (likes/comments).
- NEVER name a third party from a LinkedIn post. If the signal is a post about someone else (a colleague, a connection being praised, a farewell shout-out), treat it as Priority C — open with a golden handcuffs universal truth instead. The recipient would have zero context for why a stranger is referencing names from their social feed.

TEMPLATE REFERENCE — rotate structure per email:
${EMAIL_TEMPLATES}

FINAL CHECK — binary pass/fail. Rewrite until ALL 7 pass before outputting:
1. Word count 50–90. If outside range, cut or expand.
2. Priority A/B: first sentence after greeting opens directly with the signal topic. No "I noticed", no flattery.
   Priority C: first sentence opens with a universal career truth. No fabricated hooks.
3. Zero words from PROHIBITED PHRASES or PROHIBITED AI-SOUNDING VOCABULARY. If any found — rewrite. No rationalisations.
4. ZERO em dashes (—) or en dashes (–) anywhere in the email. Replace with a comma, period, or new sentence.
   THIS IS A HARD FAIL. One em dash = the entire email must be rewritten.
5. Zero exclamation points. Max 2 consecutive sentences starting with "I" or "Most".
6. Zero AI starter sentences. If your opener reads like ChatGPT output, delete and rewrite.
7. Plain text only. No markdown, no bullets, no quotation marks framing the email.
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

Required closing question (use word for word as the final sentence): "${requiredCTA}"

Write the email. Plain text only. No markdown. No quotes around the email.`;

            // ── Generation + server-side prohibited phrase guard ──────────────
            // GPT occasionally drifts on prohibited phrases despite prompt instructions.
            // We scan the output deterministically and retry once if needed — 100% reliable.
            async function generateEmail(): Promise<string> {
                const { text } = await generateText({
                    model: openai("gpt-4o"),
                    system: systemPrompt,
                    prompt: userPrompt,
                });
                return text;
            }

            let emailText = await generateEmail();

            // ── Server-side prohibited phrase scan ─────────────────────────────
            // GPT occasionally drifts on prohibited phrases despite prompt instructions.
            // We scan the output deterministically and retry once if needed — 100% reliable.
            const emailLower = emailText.toLowerCase();
            const hitPhrase = PROHIBITED_PHRASES.find(phrase =>
                emailLower.includes(phrase.toLowerCase())
            );

            if (hitPhrase) {
                // Retry once with an explicit prefix nudge
                const retryPrompt = userPrompt +
                    `\n\n[SYSTEM NOTE: Your previous draft contained the prohibited phrase "${hitPhrase}". ` +
                    `Rewrite the email without using that phrase or any other phrase on the PROHIBITED PHRASES list. ` +
                    `Do not reference this note in your output.]`;
                const { text: retryText } = await generateText({
                    model: openai("gpt-4o"),
                    system: systemPrompt,
                    prompt: retryPrompt,
                });
                emailText = retryText;
            }

            // ── Verbatim post-quote detection ──────────────────────────────────
            // Hard blacklist rule: never quote the prospect's own words verbatim.
            // Compare meaningful words (> 3 chars) from the signal against the email.
            // If overlap ratio > 60% across 4+ signal words, force a paraphrase retry.
            if (signalType.startsWith("Priority B") && primarySignal.length > 0) {
                const signalMeaningfulWords = primarySignal
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(w => w.replace(/[^a-z]/g, "").length > 3);
                if (signalMeaningfulWords.length >= 4) {
                    const emailTextLower = emailText.toLowerCase();
                    const matchCount = signalMeaningfulWords.filter(w =>
                        emailTextLower.includes(w.replace(/[^a-z]/g, ""))
                    ).length;
                    const verbatimRatio = matchCount / signalMeaningfulWords.length;
                    if (verbatimRatio > 0.6) {
                        // High verbatim overlap detected — retry with explicit paraphrase instruction
                        const verbatimRetryPrompt = userPrompt +
                            `\n\n[SYSTEM NOTE: Your previous draft copied too many words directly from the Personalization Signal. ` +
                            `Rewrite the email. You MUST paraphrase the TOPIC only — do not copy any specific words or phrases from the signal. ` +
                            `Do not reference this note in your output.]`;
                        const { text: verbatimRetryText } = await generateText({
                            model: openai("gpt-4o"),
                            system: systemPrompt,
                            prompt: verbatimRetryPrompt,
                        });
                        emailText = verbatimRetryText;
                    }
                }
            }

            // ── Deterministic post-generation sanitizer ───────────────────────
            // Runs AFTER all GPT retries. GPT-triggered retries can themselves
            // produce em/en dashes — a single retry is not enough since the
            // re-generation has no memory of the previous violation.
            //
            // Rules applied here are hard formatting constraints that are 100%
            // deterministically fixable with string operations — no GPT needed.
            //
            // Rule 1: Em dash (U+2014) and en dash (U+2013) — replace with a
            //   comma or period depending on context. Simple heuristic: if the
            //   character is surrounded by spaces, replace with a comma; otherwise
            //   replace with a comma (conservative choice that reads naturally).
            emailText = emailText
                .replace(/ — /g, ", ")   // em dash surrounded by spaces → comma
                .replace(/—/g, ", ")      // em dash with no spaces → comma
                .replace(/ – /g, ", ")    // en dash surrounded by spaces → comma
                .replace(/–/g, ", ");     // en dash with no spaces → comma

            // Rule 2: CTA deduplication + enforcement.
            // GPT can embed the CTA inside the body paragraph AND add it again at the end,
            // producing a duplicate. The endsWith() check misses this case.
            //
            // Strategy:
            //   a. Normalize Unicode smart quotes/apostrophes → straight ASCII so that
            //      GPT's curly-quote CTA variants ("that\u2019s") match our straight-quote
            //      CLOSING_CTAS definitions. Without this, the strip regex misses GPT's
            //      version and we end up with TWO CTAs (theirs + the appended clean copy).
            //   b. Strip ALL occurrences of every approved CTA from the normalized text.
            //   c. Collapse any resulting blank lines caused by removal.
            //   d. Append exactly one copy of requiredCTA on its own line.
            //
            // This runs unconditionally — it's cheaper than any conditional logic
            // and guarantees one clean CTA regardless of GPT output.
            emailText = emailText
                .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // curly/smart single quotes → straight '
                .replace(/[\u201C\u201D\u201E\u201F]/g, '"');   // curly/smart double quotes → straight "

            const approvedEndings = CLOSING_CTAS as readonly string[];
            for (const cta of approvedEndings) {
                // Replace the CTA whether it appears mid-sentence (with trailing punctuation
                // that may already be part of the string) or as a standalone line.
                // Escape regex special chars in CTA.
                const escaped = cta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                emailText = emailText.replace(new RegExp(escaped, "gi"), "").trim();
            }
            // Remove any doubled blank lines left behind by the removal
            emailText = emailText.replace(/\n{3,}/g, "\n\n").trim();
            // Append the required CTA as a clean standalone line
            emailText = emailText + "\n" + requiredCTA;
            console.log(`[personalizer] Sanitizer enforced CTA: "${requiredCTA}"`);

            return { draftEmail: emailText, hitPhrase: hitPhrase ?? null };

        });

        // Intelligence Layer: persist signalType and ctaUsed for outcome attribution analytics.
        // ctaUsed is computed here (outer scope) so it's accessible in save-draft-email step below.
        // It matches exactly what was injected into the GPT prompt inside generate-personalized-email.
        const ctaUsed = CLOSING_CTAS[
            lead.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % CLOSING_CTAS.length
        ];

        // Save to DB and update status
        // CAN-SPAM footer appended here — deterministically, not by the AI
        await step.run("save-draft-email", async () => {
            await prisma.lead.update({
                where: { id: lead.id },
                // @ts-ignore — signalType, ctaUsed added to schema; Prisma client regenerates on deploy
                data: {
                    draftEmail: draftEmail + CAN_SPAM_FOOTER,
                    status: "SEQUENCED",
                    signalType,  // "Priority A" | "Priority B" | "Priority C"
                    ctaUsed,     // exact CTA string deterministically selected
                } as any
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
        // Intelligence Layer: record sentAt timestamp and Instantly's internal lead ID.
        // sentAt is a dedicated column because updatedAt gets overwritten on every status change.
        // instantlyLeadId enables joining future Instantly webhook events back to our DB lead.
        await step.run("mark-as-sent", async () => {
            // Instantly v2 API returns the lead's internal ID in response data
            const instantlyId = sendResult.response?.id
                ?? sendResult.response?.leads?.[0]?.id
                ?? null;
            await prisma.lead.update({
                where: { id: lead.id },
                // @ts-ignore — sentAt, instantlyLeadId added to schema; Prisma client regenerates on deploy
                data: {
                    status: "SENT",
                    sentAt: new Date(),
                    ...(instantlyId ? { instantlyLeadId: String(instantlyId) } : {}),
                } as any
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
            // First update the Reply record with the classification
            await prisma.reply.update({
                where: { id: replyId },
                data: { classification }
            });

            // Update Lead status based on reply
            // @ts-ignore
            let newStatus = "REPLIED";
            let newSuppressionReason: string | undefined;
            if (classification === "Unsubscribe") {
                newStatus = "SUPPRESSED";
                newSuppressionReason = "unsubscribe";
            } else if (classification === "Not a fit") {
                newStatus = "SUPPRESSED";
                newSuppressionReason = "not_a_fit";
            }

            // Intelligence Layer: record repliedAt timestamp on first reply received.
            // Only write repliedAt if not already set — first reply wins.
            const leadRecord = replyData.lead!;
            const replyTimestamps: Record<string, unknown> = {};
            if (!(leadRecord as any).repliedAt) {
                replyTimestamps.repliedAt = new Date();
            }

            await prisma.lead.update({
                where: { id: leadId },
                // @ts-ignore — repliedAt, suppressionReason added to schema; Prisma client regenerates on deploy
                data: {
                    status: newStatus as any,
                    ...replyTimestamps,
                    ...(newSuppressionReason ? { suppressionReason: newSuppressionReason } : {}),
                } as any
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

// ─── PENDING_CLAY Fallback Cron ────────────────────────────────────────────────
// Leads imported via CSV sit in PENDING_CLAY until Clay enrichment arrives via
// /api/webhooks/clay. This cron is the safety net: if Clay hasn't enriched a
// lead within 24 hours, it advances to RAW and scores without enrichment signals
// (Priority C ICP fallback email). Ensures no lead is stuck in PENDING_CLAY forever.
//
// Fires Mon–Fri at 7 AM Mountain Time (13:00 UTC) — before the 8 AM warmup scheduler.

export const pendingClayFallback = inngest.createFunction(
    { id: "pending-clay-fallback", retries: 1 },
    { cron: "0 13 * * 1-5" }, // 7 AM Mountain Time (UTC-6), Mon–Fri
    async ({ step }) => {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        // Find leads stuck in PENDING_CLAY for more than 24 hours
        const stuckLeads = await step.run("find-stuck-pending-clay", async () => {
            return prisma.lead.findMany({
                where: {
                    // @ts-ignore — PENDING_CLAY added to schema; Prisma client regenerates on deploy
                    status: "PENDING_CLAY",
                    createdAt: { lt: cutoff },
                },
                select: { id: true, name: true, createdAt: true },
            });
        });

        if (stuckLeads.length === 0) {
            return { status: "No leads stuck in PENDING_CLAY", checked: new Date().toISOString() };
        }

        // Advance stuck leads to RAW so they can score without enrichment
        await step.run("advance-to-raw", async () => {
            await prisma.lead.updateMany({
                where: {
                    id: { in: stuckLeads.map(l => l.id) },
                },
                // @ts-ignore — PENDING_CLAY in schema; resolves after Prisma client regenerates
                data: { status: "RAW" },
            });
        });

        // Fire scoring pipeline for each lead
        const BATCH_SIZE = 100;
        for (let i = 0; i < stuckLeads.length; i += BATCH_SIZE) {
            const batch = stuckLeads.slice(i, i + BATCH_SIZE);
            await step.sendEvent(`fire-fallback-batch-${i}`, batch.map(lead => ({
                name: "workflow/lead.hunter.start" as const,
                data: { leadId: lead.id },
            })));
        }

        console.log(`[pending-clay-fallback] Advanced ${stuckLeads.length} leads from PENDING_CLAY → RAW`);

        return {
            status: "Advanced",
            count: stuckLeads.length,
            leads: stuckLeads.map(l => ({ id: l.id, name: l.name, age: l.createdAt })),
        };
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
            const startsAt = twoDaysAgo.toISOString().replace(/\.\d{3}Z$/, "Z"); // Full ISO 8601: 2026-03-18T00:00:00Z (TidyCal rejects date-only)

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

                    // Intelligence Layer: record bookedAt timestamp for SENT→BOOKED velocity analysis.
                    // bookedAt is a dedicated column because updatedAt is overwritten on every status change.
                    await prisma.lead.update({
                        where: { id: lead.id },
                        // @ts-ignore — BOOKED added to schema; migration runs on next Vercel deploy
                        data: { status: "BOOKED" as any, bookedAt: new Date() },
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

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Intelligence Digest
// Runs every Monday at 8 AM Mountain Time — before the daily send cron fires.
// Queries outcome attribution data and posts a structured Slack summary:
//   • Funnel overview (sent → replied → booked, all-time)
//   • Signal effectiveness (Priority A/B/C reply + booking rates, last 30 days)
//   • Score band validation (are high scorers actually booking at higher rates?)
//   • CTA performance breakdown (last 30 days)
//   • Suppression reasons (all-time — shows where the pipeline is leaking)
//   • Booked lead attribute profiles (Sales Nav attributes of converted leads)
//   • Scoring model health flag (auto-detects if weighting needs review)
//
// Surface: Slack → #waypoint-hot-replies. Zero new dashboard UI needed.
// ─────────────────────────────────────────────────────────────────────────────

export const weeklyIntelligenceDigest = inngest.createFunction(
    { id: "weekly-intelligence-digest", retries: 1 },
    { cron: "0 14 * * 1" }, // Monday 8 AM Mountain Time (UTC-6)
    async ({ step }) => {
        const stats = await step.run("gather-intelligence-stats", async () => {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // All-time funnel counts
            const [totalSent, totalReplied, totalBooked, totalSuppressed] = await Promise.all([
                prisma.lead.count({ where: { sentAt: { not: null } } as any }),
                prisma.lead.count({ where: { status: "REPLIED" } }),
                prisma.lead.count({ where: { status: "BOOKED" } }),
                prisma.lead.count({ where: { status: "SUPPRESSED" } }),
            ]);

            // Signal effectiveness — last 30 days
            const signalKeys = ["Priority A", "Priority B", "Priority C"];
            const signalSent = await Promise.all(
                signalKeys.map(async sig => ({
                    sig,
                    count: await prisma.lead.count({
                        where: { signalType: sig, sentAt: { not: null, gte: thirtyDaysAgo } } as any,
                    }),
                }))
            );
            const signalReplied = await Promise.all(
                signalKeys.map(async sig => ({
                    sig,
                    count: await prisma.lead.count({
                        where: { signalType: sig, sentAt: { not: null, gte: thirtyDaysAgo }, status: { in: ["REPLIED", "BOOKED"] } } as any,
                    }),
                }))
            );
            const signalBooked = await Promise.all(
                signalKeys.map(async sig => ({
                    sig,
                    count: await prisma.lead.count({
                        where: { signalType: sig, sentAt: { not: null, gte: thirtyDaysAgo }, status: "BOOKED" } as any,
                    }),
                }))
            );

            // Score band validation (all-time)
            const scoreBands = [
                { label: "80-100", min: 80, max: 100 },
                { label: "65-79",  min: 65, max: 79  },
                { label: "50-64",  min: 50, max: 64  },
            ];
            const scoreBandData = await Promise.all(
                scoreBands.map(async ({ label, min, max }) => {
                    const [sent, replied, booked] = await Promise.all([
                        prisma.lead.count({ where: { sentAt: { not: null }, score: { gte: min, lte: max } } as any }),
                        prisma.lead.count({ where: { sentAt: { not: null }, score: { gte: min, lte: max }, status: { in: ["REPLIED", "BOOKED"] } } as any }),
                        prisma.lead.count({ where: { sentAt: { not: null }, score: { gte: min, lte: max }, status: "BOOKED" } as any }),
                    ]);
                    return { label, sent, replied, booked };
                })
            );

            // CTA performance (last 30 days)
            const ctaKeys = [
                "Worth a conversation?",
                "Would it be worth 15 minutes to find out?",
                "Curious if that's even a thought?",
            ];
            const ctaData = await Promise.all(
                ctaKeys.map(async cta => {
                    const [sent, replied] = await Promise.all([
                        prisma.lead.count({ where: { ctaUsed: cta, sentAt: { not: null, gte: thirtyDaysAgo } } as any }),
                        prisma.lead.count({ where: { ctaUsed: cta, sentAt: { not: null, gte: thirtyDaysAgo }, status: { in: ["REPLIED", "BOOKED"] } } as any }),
                    ]);
                    return { cta, sent, replied };
                })
            );

            // Suppression reasons (all-time)
            const suppressionReasons = ["low_score", "title_suppressed", "non_serviceable_market", "unsubscribe", "not_a_fit", "bounce"];
            const suppressionCounts = await Promise.all(
                suppressionReasons.map(async reason => ({
                    reason,
                    count: await prisma.lead.count({ where: { status: "SUPPRESSED", suppressionReason: reason } as any }),
                }))
            );

            // Booked lead attribute profiles
            const bookedLeads = await prisma.lead.findMany({
                where: { status: "BOOKED" },
                select: { seniorityLevel: true, companySizeRange: true, industryVertical: true, functionArea: true, score: true, signalType: true } as any,
                orderBy: { updatedAt: "desc" },
                take: 10,
            });

            return {
                totalSent, totalReplied, totalBooked, totalSuppressed,
                signalSent, signalReplied, signalBooked,
                scoreBandData,
                ctaData,
                suppressionCounts,
                bookedLeads,
                generatedAt: now.toISOString(),
            };
        });

        // Format and post to Slack
        await step.run("post-to-slack", async () => {
            const slackWebhook = process.env.SLACK_WEBHOOK_URL;
            if (!slackWebhook) {
                console.warn("[intelligence-digest] No SLACK_WEBHOOK_URL set — skipping Slack post");
                return;
            }

            const pct = (n: number, d: number) => (d === 0 ? "N/A" : `${Math.round(n * 100 / d)}%`);

            const signalLines = ["Priority A", "Priority B", "Priority C"].map(sig => {
                const sent = stats.signalSent.find(s => s.sig === sig)?.count ?? 0;
                const rep  = stats.signalReplied.find(s => s.sig === sig)?.count ?? 0;
                const book = stats.signalBooked.find(s => s.sig === sig)?.count ?? 0;
                const desc = sig === "Priority A" ? "company news" : sig === "Priority B" ? "LinkedIn post" : "ICP fallback";
                const letter = sig.split(" ")[1];
                return `• *${letter}* (${desc}): ${sent} sent, ${rep} replied (${pct(rep, sent)}), ${book} booked (${pct(book, sent)})`;
            });

            const scoreBandLines = stats.scoreBandData.map(b =>
                `• *${b.label}:* ${b.sent} sent, ${b.replied} replied (${pct(b.replied, b.sent)}), ${b.booked} booked (${pct(b.booked, b.sent)})`
            );

            const ctaLines = stats.ctaData
                .filter(c => c.sent > 0)
                .map(c => `• _"${c.cta}"_ — ${c.sent} sent, ${c.replied} replied (${pct(c.replied, c.sent)})`);
            if (ctaLines.length === 0) ctaLines.push("• No data yet — CTA tracking is live from this deploy forward");

            const suppressionLines = stats.suppressionCounts
                .filter(s => s.count > 0)
                .sort((a, b) => b.count - a.count)
                .map(s => `• ${s.reason}: ${s.count}`);
            if (suppressionLines.length === 0) suppressionLines.push("• No categorized suppressions yet");

            const bookedAttrLines = (stats.bookedLeads as any[]).slice(0, 5).map((l: any) =>
                `• ${l.seniorityLevel ?? "?"} | ${l.companySizeRange ?? "? size"} | ${l.industryVertical ?? "? industry"} | signal: ${l.signalType ?? "pre-capture"} | score: ${l.score}`
            );
            if (bookedAttrLines.length === 0) bookedAttrLines.push("• No bookings yet — add Sales Navigator columns in Clay to populate attributes");

            const high = stats.scoreBandData.find(b => b.label === "80-100");
            const low  = stats.scoreBandData.find(b => b.label === "50-64");
            const scoringFlag = (low?.sent ?? 0) > 10 && (low?.booked ?? 0) > (high?.booked ?? 0)
                ? "WARNING Scoring flag: Leads scoring 50-64 are booking more than 80-100 scorers. Review weights in leadHunterProcess."
                : stats.totalBooked === 0
                    ? "Scoring note: No bookings yet. Model needs 15+ bookings before insights are statistically meaningful."
                    : "Scoring model: High-score leads are converting as expected.";

            const weekDate = new Date(stats.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

            await fetch(slackWebhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: `Weekly Pipeline Intelligence — ${weekDate}`,
                    blocks: [
                        { type: "header", text: { type: "plain_text", text: `Weekly Pipeline Intelligence — ${weekDate}` } },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*All-time funnel:* ${stats.totalSent} sent, ${stats.totalReplied} replied (${pct(stats.totalReplied, stats.totalSent)}), ${stats.totalBooked} booked (${pct(stats.totalBooked, stats.totalSent)}), ${stats.totalSuppressed} suppressed`,
                            },
                        },
                        { type: "divider" },
                        { type: "section", text: { type: "mrkdwn", text: `*Signal Effectiveness (last 30 days):*\n${signalLines.join("\n")}` } },
                        { type: "section", text: { type: "mrkdwn", text: `*Score Band Validation (all-time):*\n${scoreBandLines.join("\n")}` } },
                        { type: "section", text: { type: "mrkdwn", text: `*CTA Performance (last 30 days):*\n${ctaLines.join("\n")}` } },
                        { type: "section", text: { type: "mrkdwn", text: `*Suppression Breakdown (all-time):*\n${suppressionLines.join("\n")}` } },
                        { type: "section", text: { type: "mrkdwn", text: `*Booked Lead Profiles (most recent 5):*\n${bookedAttrLines.join("\n")}` } },
                        { type: "section", text: { type: "mrkdwn", text: scoringFlag } },
                        {
                            type: "context",
                            elements: [{ type: "mrkdwn", text: `Auto-generated ${weekDate} by Waypoint Intelligence Digest. Live data from Neon DB. Pre-deploy sends show as pre-capture and will clear after the next full send cycle.` }],
                        },
                    ],
                }),
            });

            console.log(`[intelligence-digest] Slack report posted for ${weekDate}`);
        });

        return { status: "Posted", generatedAt: stats.generatedAt };
    }
);

// ─── Checklist Nurture Sequence ───────────────────────────────────────────────
// Triggered when a checklist is downloaded via /api/capture-email.
// Sends 4 timed follow-up emails (Days 3, 7, 14, 21) after the delivery email.
// Email 2 and 3 have category-specific copy; Email 4 and 5 are universal.
// Unsubscribe is checked from DB before every send — honouring mid-sequence opt-outs.

import {
    buildUnsubscribeUrl,
    buildNurtureFooter,
    NURTURE_EMAIL_2,
    NURTURE_EMAIL_3,
    NURTURE_EMAIL_4,
    NURTURE_EMAIL_5,
} from "@/lib/nurture-emails";

const NURTURE_FROM = "Kelsey at Waypoint <noreply@mail.waypointfranchise.com>";
const NURTURE_REPLY_TO = "kelsey@waypointfranchise.com";

export const checklistNurtureProcess = inngest.createFunction(
    { id: "checklist-nurture-process", retries: 2 },
    { event: "nurture/checklist.download" },
    async ({ event, step }) => {
        const { downloadId, email, name, checklistType } = event.data as {
            downloadId: string;
            email: string;
            name: string | null;
            checklistType: string;
            articleSlug: string | null;
        };

        const firstName = name ? name.split(" ")[0] : "there";
        const unsubscribeUrl = buildUnsubscribeUrl(downloadId);
        const footer = buildNurtureFooter(unsubscribeUrl);

        // Helper: reload record and gate on unsubscribed flag
        async function isUnsubscribed(): Promise<boolean> {
            // @ts-ignore — unsubscribed added to schema; Prisma client regenerates on deploy
            const record = await prisma.checklistDownload.findUnique({
                where: { id: downloadId },
                // @ts-ignore
                select: { unsubscribed: true },
            }) as any;
            return record?.unsubscribed ?? false;
        }

        // Helper: update nurtureStep after a successful send
        async function markStep(stepNum: number, completed = false) {
            // @ts-ignore — nurtureStep / nurtureCompletedAt added to schema; Prisma client regenerates on deploy
            await prisma.checklistDownload.update({
                where: { id: downloadId },
                data: {
                    nurtureStep: stepNum,
                    ...(completed ? { nurtureCompletedAt: new Date() } : {}),
                } as any,
            });
        }

        // ── Email 2 — Day 3 ─────────────────────────────────────────────────
        await step.sleep("wait-for-email-2", "3d");

        await step.run("send-email-2", async () => {
            if (await isUnsubscribed()) return { skipped: true, reason: "unsubscribed" };

            // Fall back to universal copy if checklistType key is missing
            const em2 = NURTURE_EMAIL_2[checklistType] ?? NURTURE_EMAIL_2["universal"];
            const body = [`Hi ${firstName},`, "", em2.body, footer].join("\n");

            await resend.emails.send({
                from: NURTURE_FROM,
                to: email,
                replyTo: NURTURE_REPLY_TO,
                subject: em2.subject,
                headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
                text: body,
            });

            await markStep(2);
            return { sent: true, step: 2 };
        });

        // ── Email 3 — Day 7 (4 more days after Email 2) ─────────────────────
        await step.sleep("wait-for-email-3", "4d");

        await step.run("send-email-3", async () => {
            if (await isUnsubscribed()) return { skipped: true, reason: "unsubscribed" };

            const em3 = NURTURE_EMAIL_3[checklistType] ?? NURTURE_EMAIL_3["universal"];
            const body = [`Hi ${firstName},`, "", em3.body, footer].join("\n");

            await resend.emails.send({
                from: NURTURE_FROM,
                to: email,
                replyTo: NURTURE_REPLY_TO,
                subject: em3.subject,
                headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
                text: body,
            });

            await markStep(3);
            return { sent: true, step: 3 };
        });

        // ── Email 4 — Day 14 (7 more days after Email 3) ────────────────────
        await step.sleep("wait-for-email-4", "7d");

        await step.run("send-email-4", async () => {
            if (await isUnsubscribed()) return { skipped: true, reason: "unsubscribed" };

            const body = [`Hi ${firstName},`, "", NURTURE_EMAIL_4.body, footer].join("\n");

            await resend.emails.send({
                from: NURTURE_FROM,
                to: email,
                replyTo: NURTURE_REPLY_TO,
                subject: NURTURE_EMAIL_4.subject,
                headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
                text: body,
            });

            await markStep(4);
            return { sent: true, step: 4 };
        });

        // ── Email 5 — Day 21 (7 more days after Email 4) ────────────────────
        await step.sleep("wait-for-email-5", "7d");

        await step.run("send-email-5", async () => {
            if (await isUnsubscribed()) return { skipped: true, reason: "unsubscribed" };

            // Email 5 has a built-in sign-off so we omit the "Hi firstName" greeting
            const body = [NURTURE_EMAIL_5.body, footer].join("\n");

            await resend.emails.send({
                from: NURTURE_FROM,
                to: email,
                replyTo: NURTURE_REPLY_TO,
                subject: NURTURE_EMAIL_5.subject,
                headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
                text: body,
            });

            await markStep(5, true); // mark sequence complete
            return { sent: true, step: 5 };
        });

        return { status: "Sequence complete", downloadId };
    }
);

// ─── Scorecard Nurture Sequence ───────────────────────────────────────────────
// Triggered from /api/scorecard-complete after Email 1 (immediate results) is sent.
// Sends 2 timed follow-ups: Day 3 and Day 7.
// Before each send, checks:
//   1. ScorecardSubmission.unsubscribed  — opt-out via unsubscribe link
//   2. Lead.bookedAt                     — TidyCal booking received (highest intent)
//   3. Lead.status === REPLIED           — reply detected via Instantly or manual log
// Any of these stops the sequence immediately.

import { buildUnsubscribeUrl as buildScorecardUnsubscribeUrl } from "@/lib/nurture-emails";

const SCORECARD_FROM = "Kelsey Stuart <kelsey@waypointfranchise.com>";
const SCORECARD_REPLY_TO = "kelsey@waypointfranchise.com";

export const scorecardNurtureProcess = inngest.createFunction(
    { id: "scorecard-nurture-process", retries: 2 },
    { event: "nurture/scorecard.complete" },
    async ({ event, step }) => {
        const { submissionId, email, name, score } = event.data as {
            submissionId: string;
            email: string;
            name: string;
            score: number;
        };

        const firstName = name ? name.split(" ")[0] : "there";

        // Reuse the HMAC token helper — we pass submissionId as the identifier.
        // The unsubscribe endpoint at /api/scorecard-unsubscribe validates this same token.
        const unsubscribeUrl = buildScorecardUnsubscribeUrl(submissionId).replace(
            "/api/unsubscribe?",
            "/api/scorecard-unsubscribe?"
        );

        const unsubscribeHeaders = {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        };

        const plainFooter = [
            "",
            "---",
            "Waypoint Franchise Advisors",
            "P.O. Box 3421, Whitefish, MT 59937",
            `To stop receiving these notes: ${unsubscribeUrl}`,
        ].join("\n");

        // Helper: determine if the sequence should stop before the next send.
        // Returns { stop: true, reason } if any suppression condition is met.
        async function shouldSuppress(): Promise<{ stop: boolean; reason?: string }> {
            // 1. Explicit unsubscribe via link
            const submission = await (prisma as any).scorecardSubmission.findUnique({
                where: { id: submissionId },
                select: { unsubscribed: true },
            });
            if (submission?.unsubscribed) return { stop: true, reason: "unsubscribed" };

            // 2. Lead booked a call (TidyCal sync writes bookedAt)
            // 3. Lead replied to cold email (replyGuardianProcess sets status=REPLIED)
            const lead = await prisma.lead.findFirst({
                where: { email },
                select: { status: true, bookedAt: true },
            });
            if (lead?.bookedAt) return { stop: true, reason: "booked" };
            if (lead?.status === "REPLIED") return { stop: true, reason: "replied" };

            return { stop: false };
        }

        // Helper: track nurture progress
        async function markStep(stepNum: number, completed = false) {
            await (prisma as any).scorecardSubmission.update({
                where: { id: submissionId },
                data: {
                    nurtureStep: stepNum,
                    ...(completed ? { nurtureCompletedAt: new Date() } : {}),
                },
            });
        }

        // ── Email 2 — Day 3: "The 3 questions most people forget to ask" ────────
        await step.sleep("wait-for-scorecard-email-2", "3d");

        await step.run("send-scorecard-email-2", async () => {
            const suppress2 = await shouldSuppress();
            if (suppress2.stop) return { skipped: true, reason: suppress2.reason };

            const subject = `The 3 questions most people forget to ask before buying a franchise`;

            const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>
    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the 3 questions most people forget to ask before they buy a franchise.
    </h1>
    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I've been through a lot of franchise discovery processes, as a franchisor, as a franchisee, and now as an advisor. The people who make good decisions almost always ask the same three things. Most people don't ask any of them.
    </p>
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">01</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">"What does a bad week look like?"</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        Everyone talks to the brand's success stories. Ask to talk to a franchisee who had a rough first year. What went wrong? What did they wish they'd known? The brand will tell you how great things can be. The franchisees will tell you what it actually takes.
      </p>
    </div>
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">02</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">"What's the real reason people leave the system?"</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        The FDD tells you how many units closed last year. It doesn't tell you why. Was it underperformance? Retirement? Conflict with the franchisor? The difference matters enormously. If you're buying a system, you're betting on how well it retains owners.
      </p>
    </div>
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">03</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a1a;">"How does the brand make money when I'm struggling?"</p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        Royalties are a percentage of top-line revenue, so the brand gets paid whether you're profitable or not. Understanding the real numbers at the median owner level, not the best case, is everything.
      </p>
    </div>
    <p style="margin:28px 0;font-size:16px;color:#4a4a4a;line-height:1.7;">
      These are the conversations I have with every person I work with before we ever look at a brand list. If you want to have that conversation now, my calendar is open.
    </p>
    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>
    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

            const textBody = [
                `${firstName},`,
                "",
                subject,
                "",
                `01. "What does a bad week look like?"`,
                `Talk to a franchisee who had a rough first year, not just the success stories.`,
                "",
                `02. "What's the real reason people leave the system?"`,
                `The FDD tells you how many units closed. It doesn't tell you why.`,
                "",
                `03. "How does the brand make money when I'm struggling?"`,
                `Royalties come off the top. Understand the median unit economics, not the best case.`,
                "",
                `These are the conversations I have with every person before we look at a single brand.`,
                "",
                `Book a free call: https://waypointfranchise.com/book`,
                plainFooter,
            ].join("\n");

            await resend.emails.send({
                from: SCORECARD_FROM,
                to: email,
                replyTo: SCORECARD_REPLY_TO,
                subject,
                html: htmlBody,
                text: textBody,
                headers: unsubscribeHeaders,
                tags: [{ name: "sequence", value: "scorecard-email-2" }],
            });

            await markStep(2);
            return { sent: true, step: 2 };
        });

        // ── Email 3 — Day 7 (4 more days after Email 2): Soft close ─────────────
        await step.sleep("wait-for-scorecard-email-3", "4d");

        await step.run("send-scorecard-email-3", async () => {
            const suppress3 = await shouldSuppress();
            if (suppress3.stop) return { skipped: true, reason: suppress3.reason };

            const subject = `Still thinking about it, ${firstName}?`;

            const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>
    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, still thinking about it?
    </h1>
    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      A few days ago you scored ${score}/100 on the Franchise Readiness Quiz. I haven't heard from you since, and that's completely fine. This is a big decision and it deserves time.
    </p>
    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      I want to be straightforward with you: I'm not going to send you a dozen emails. This is the last one unless you reach out. I don't believe in pushing people toward something this significant.
    </p>
    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      What I can offer is 30 minutes where I'll tell you exactly what I think, whether that's "here are three concepts worth exploring" or "honestly, now isn't the right time." Either answer is useful. Neither costs you anything.
    </p>
    <div style="background:#0c1929;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 8px;font-size:22px;color:#FFFFFF;line-height:1.4;">
        &ldquo;The worst outcome is making a $300K decision on incomplete information.&rdquo;
      </p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#CC6535;">
        — Something I say in every first call
      </p>
    </div>
    <p style="margin:0 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If the timing still isn't right, no hard feelings. Bookmark the link and come back when it is.
    </p>
    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free Call When You're Ready
    </a>
    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">This is the last email in this series.</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

            const textBody = [
                `${firstName},`,
                "",
                `Still thinking about it?`,
                "",
                `A few days ago you scored ${score}/100 on the Franchise Readiness Quiz.`,
                "",
                `I'm not going to send you a dozen emails. This is the last one unless you reach out.`,
                "",
                `What I can offer is 30 minutes where I'll tell you exactly what I think, whether that's "here are three concepts worth exploring" or "honestly, now isn't the right time." Either answer is useful.`,
                "",
                `"The worst outcome is making a $300K decision on incomplete information."`,
                "",
                `Book a free call when you're ready: https://waypointfranchise.com/book`,
                "",
                `This is the last email in this series.`,
                plainFooter,
            ].join("\n");

            await resend.emails.send({
                from: SCORECARD_FROM,
                to: email,
                replyTo: SCORECARD_REPLY_TO,
                subject,
                html: htmlBody,
                text: textBody,
                headers: unsubscribeHeaders,
                tags: [{ name: "sequence", value: "scorecard-email-3" }],
            });

            await markStep(3, true);
            return { sent: true, step: 3 };
        });

        return { status: "Scorecard nurture complete", submissionId };
    }
);

