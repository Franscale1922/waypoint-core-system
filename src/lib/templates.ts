// ─── Personalization Architecture ─────────────────────────────────────────────
// Based on 3-model research consensus (Perplexity, Gemini, Claude — March 2026).
// Source: docs/COLD_EMAIL_STACK.md §5 (GPT-4o / Personalization)
//
// MAXIMUM: 2 personalization signals per email.
// Signal hierarchy (cascade — use highest available):
//   Priority A: companyNewsEvent — WARN Act, SEC 8-K, reorg, layoffs (public macro data)
//   Priority B: recentPostSummary — paraphrase of LinkedIn post TOPIC (never verbatim)
//   Priority C: Role-level narrative framing (no personal data at all)
//
// HARD BLACKLIST — never reference regardless of data availability:
//   ❌ Verbatim quotes from posts (creepiness: 7/10)
//   ❌ City, state, or physical location
//   ❌ Years at company / tenure
//   ❌ Passive LinkedIn activity (likes, comments, shares)
//   ❌ Personal hobbies or interests
//   ❌ College, university, or graduation year
//   ❌ Mutual LinkedIn connections (unless you have a real relationship)
//   ❌ Inferred emotional states ("it seems like you're considering…")
//
// QUALITY GATE: If neither Priority A nor Priority B token is populated,
// the lead must be HELD in queue — do not send a degraded email.

// ─── Approved Closing CTAs ────────────────────────────────────────────────────
// GPT defaults to "Curious if that's even a thought?" in ~80% of generations.
// To enforce rotation, functions.ts selects one deterministically by lead-name
// hash and injects it as a hard instruction — GPT's choice is removed entirely.
export const CLOSING_CTAS = [
    "Worth a conversation?",
    "Would it be worth 15 minutes to find out?",
    "Curious if that's even a thought?",
] as const;

// ─── Voice Rules ──────────────────────────────────────────────────────────────
// Injected into the GPT-4o system prompt on every personalization call.

export const VOICE_RULES = `
IDENTITY
You are writing on behalf of Kelsey Stuart, a franchise advisor at Waypoint Franchise Advisors.
She is a fiduciary guide — not a recruiter, not a broker. The service costs the prospect nothing.
Most people who talk to her do not buy a franchise. Her job is to help them find out whether they should.

TARGET READER
One person: a mid-to-late career professional (40–58), high performer, analytical, skeptical of sales.
They have a family, a mortgage, and something real to lose. Write to that person, not to a demographic.

GOAL
Generate one reply. Not a meeting. Not a commitment. Just a reply that opens a conversation.

VOICE
Calm. Direct. Confident but not arrogant. Never excited. Never promotional.
Sounds like a real person typed it at their desk, not a campaign built around them.
Use contractions. It is fine to start a sentence with "But" or "And."
One sentence fragment or one question under six words is acceptable.
Brevity is your best tool. Under 80 words is the target. Never exceed 110.

SIGNAL RULES (mandatory)
You will receive exactly 1–2 context signals. Use them implicitly — never explain the connection between the signal and the pitch.
BAD: "I saw Boeing had layoffs, which must mean you're under pressure, so franchise ownership might help."
GOOD: "With Boeing's restructuring underway, a lot of directors in ops have started running parallel plans."
The observation is the signal. The connection is the reader's job to make.

OPENING RULES
The first sentence must reference the signal — not Kelsey, not a greeting, not a compliment.
GOOD: "With the reorg at Boeing, operations mandates are getting rewritten every quarter right now."
GOOD: "Read your take on the leadership changes. The directional shift you described is real."
BAD: "I came across your profile." / "I noticed you posted about…" / "Congratulations on…"
Never open with a compliment. Never mention LinkedIn explicitly. Never say "I noticed" or "I saw."

COGNITIVE ECONOMY
Never state the logical connection between the signal and the offer. Assume the reader is intelligent enough to draw the connection themselves.
A peer does not explain their reasoning. They make an observation and ask a question.

STRUCTURE — rotate across emails, do not always use the same order
Option 1: observation → peer inference → value → soft CTA
Option 2: news anchor → social proof ("a lot of directors in your position…") → permission-based question
Option 3: career-arc framing → specific outcome → soft CTA

CLOSING RULES — mandatory
The closing question for this email will be specified in the user prompt. Use it word for word as your final sentence. Do not substitute a different question, do not omit it, do not add any sentence after it.
Approved options (one will be required): "Worth a conversation?" / "Would it be worth 15 minutes to find out?" / "Curious if that's even a thought?"
Never: "Can we schedule a call?" / "Let's hop on a call" / "Find 15 minutes on your calendar."


WHAT THIS EMAIL MUST NEVER DO
❌ Pitch a franchise brand or promise financial outcomes
❌ Use exclamation points
❌ Start three consecutive sentences with "I" or "Most"
❌ Reference years of tenure, city, location, hobbies, college, or graduation year
❌ Quote the prospect's own words back to them verbatim (paraphrase instead)
❌ Monitor passive behavior ("I saw you liked…" / "I noticed you commented on…")
❌ Claim to know what the reader is feeling or planning ("it seems like you're considering…")
❌ Explain the logical transition between signal and offer — trust the reader
❌ Use passive voice — say who does what
❌ Use em dashes (—) or en dashes (–). Replace with a comma, period, or convert to a new sentence. This is a hard rule — one em dash fails the entire draft.
❌ Use AI-sounding vocabulary: delve, leverage, landscape, synergies, pivoting, intersection, tapestry, multifaceted, embark, journey, realm, navigate, unlock, transform, revolutionize, innovative, cutting-edge, game-changing, thought leader, visionary, robust, it's clear that, it goes without saying, needless to say, in today's fast-paced, in the ever-evolving.
❌ Open the email body with AI starter sentences: "In today...", "As a...", "With the current...", "It's no secret...", "As someone who...", "Given your...", "I noticed...", "I wanted to reach out", "I hope this finds you well", "I'm reaching out because".
❌ Name or reference a third party from a LinkedIn post. Posts about someone else (farewells, praise for a colleague leaving) provide zero context to the recipient and feel surveillance-like. Treat them as Priority C.
`;


export const PROHIBITED_PHRASES = [
    // Classic spam tells
    "I hope this email finds you well",
    "I came across your profile",
    "I'm reaching out because",
    "I noticed",
    "I saw your",
    "Congratulations on",
    "just touching base",
    "checking in",
    "touching base",
    "hope you're having a great",
    // AI clichés — banned per research consensus
    "in today's world",
    "at the end of the day",
    "cutting-edge",
    "leverage",
    "solutions",
    "synergy",
    "paradigm",
    "delve",
    "navigating",
    "testament",
    "realm",
    "tapestry",
    "foster",
    "catalyst",
    "Moreover,",
    "Furthermore,",
    "It is worth noting",
    // Surveillance tells
    "I've been following",
    "I've been watching",
    "based in",
    "located in",
    "years of experience",
    "you've been at",
    "I see you went to",
    "your alma mater",
    // Forced enthusiasm
    "I'd love to",
    "I would love to",
    "amazing",
    "incredible",
    "fantastic",
    "excited to",
    "thrilled to",
    // Pushy CTAs
    "hop on a call",
    "find 15 minutes on your calendar",
    "schedule a call",
    "book a meeting",
    "let's connect",
    // Eager-salesperson closings (spirit of "I'd love to" — closes the gap)
    "I'd be glad to",
    "I would be glad to",
    "I'd be happy to",
    "I would be happy to",
    "walk you through",
    // Hard formatting bans — added to enable server-side detection + retry
    // The FINAL CHECK prompt alone is insufficient; GPT-4o reliably ignores it.
    "—",  // em dash (U+2014) — the single most common recurring violation across audits
    "–",  // en dash (U+2013) — less common but equally banned
    // High-frequency AI vocabulary — added to server-side guard after Voice QC banner
    // confirmed these slip through the prompt instruction alone (Joel Goodman: "leverage")
    "leverage",
    "delve",
    "landscape",
    "synergies",
    "embark",
    "tapestry",
    "multifaceted",
    "revolutionize",
    "cutting-edge",
    "game-changing",
    "thought leader",
    "it's clear that",
    "it goes without saying",
    "needless to say",
    "in today's fast-paced",
    "in the ever-evolving",
    "as we move forward",
    // Additional AI vocabulary caught in post-regeneration audit (10-lead review)
    // Daniel Harris: 'navigating' fired Voice QC banner but wasn't in server-side guard
    "navigating",
    "navigate",
    "visionary",
    "robust",
    "innovative",
    "it's clear",   // catches both "it's clear that" and "it's clear [X] is..."
    "sounds like you",  // flattery opener caught on Copeland Isaacson ("Sounds like you're creating significant value")
    // AI vocabulary present in VOICE_RULES prompt but missing from server-side guard
    // (confirmed by 10-lead production audit — "pivoting" appeared in O'Quinn email)
    "pivoting",
    "intersection",
    "journey",
    "unlock",
    "transform",
    "it's evident",
    "in today's dynamic",
    // Formulaic template echoes — overused across the 10-lead audit batch
    // Adding to server-side guard forces GPT to find fresh phrasing every time
    "tempting distraction",        // appeared in 5/10 emails; always paired with 'realistic alternative'
    "in your position",            // appeared in 6/10 emails: "I help people in your position..."
    "parallel plans",              // template echo — multiple emails used near-identical phrasing
    "viable alternative",          // pairs with 'tempting distraction'; forces varied framing
    // Salesperson/AI tells caught in 10-lead audit
    "no strings attached",         // Michelle Horner email — salesy filler
    "I assist",                    // Christy Hartmann — too formal vs. 'I help'
    "like yourself",               // Safiyyah O'Quinn — stilted
    "various plans",               // Safiyyah O'Quinn — vague
    "out of curiosity or necessity", // Shelley Duran — 'necessity' implies financial desperation
    "side consideration",          // Safiyyah O'Quinn — diminishes offer
    "interesting idea",            // Whitney Reed — undervalues the pitch
    "a few years back",            // Whitney Reed — stale-signal tell
    "quietly exploring",           // template echo across Whitney/Brian emails
];



// ─── CAN-SPAM Footer ──────────────────────────────────────────────────────────
// Required by law. Appended deterministically in personalizerProcess —
// never left to the AI to include or omit.
export const CAN_SPAM_FOOTER = `

--
Reply "unsubscribe" to opt out of future messages.
Waypoint Franchise Advisors | P.O. Box 3421, Whitefish, MT 59937`;

// ─── Email Templates ──────────────────────────────────────────────────────────
// 6 variants by ICP trigger. GPT-4o selects the most relevant and personalizes
// using ONLY the signals provided (max 2). Templates demonstrate correct
// cognitive economy — the connection between signal and pitch is never stated.

export const EMAIL_TEMPLATES = `
### Template A – Company Disruption Event (Priority A: strong — layoff, leadership exit, M&A, WARN Act)
Hi {{first_name}},
With {{company_news_event}}, a lot of the people who've been holding things together are starting to weigh their options. That kind of shift tends to compress the decision window.
I help executives work out whether franchise ownership is a serious path for their situation — or one to cross off the list. If that's crossed your mind at all, worth a quick conversation.
Kelsey

### Template A2 – Company Momentum News (Priority A: soft — product launch, expansion, new location)
Hi {{first_name}},
With {{company_news_event}}, it's a busy stretch. Funny timing, maybe — but moments of company momentum are often when senior leaders first start mapping out what the next chapter actually looks like for them.
I work with people who want to see the real math on franchise ownership before they decide anything. No commitment required.
Kelsey

### Template B – LinkedIn Post / Leadership Signal (Priority B signal)
Hi {{first_name}},
{{post_topic_paraphrase}}. That's the inflection point a lot of the leaders I work with hit right before they start taking ownership seriously as an actual option.
I'm not a recruiter. My job is helping people figure out if owning something makes sense for their situation — or rule it out cleanly. Worth a conversation to find out?
Kelsey

### Template C – Sales Leader / Comp Ceiling (Priority B signal)
Hi {{first_name}},
{{post_topic_paraphrase}}. Sounds like you've run the numbers on where the current trajectory tops out.
I work with directors and VPs who want to understand what building equity looks like — starting from a real picture of their capital and risk tolerance. Worth 15 minutes to look at the math together?
Kelsey

### Template D – Finance / Risk-Oriented (either signal, analytical framing)
Hi {{first_name}},
{{signal_reference}}. The people who end up working with me are usually the cautious ones — they want to see what the cash flows, downside, and exit actually look like before deciding anything.
I can't promise no risk. But I can walk through a few models in a way that would make sense to a finance brain. Worth 15 minutes?
Kelsey

### Template E – Layoff / Open to Work (Priority A: WARN Act or confirmed job loss)
Hi {{first_name}},
{{company_news_event}} strips away the calculus faster than almost anything else. Some of the people I work with used that window to seriously evaluate owning something for the first time — with clear eyes and no pressure.
If you want a straight conversation about what that actually looks like, I'm happy to make time.
Kelsey

### Template F – Role-Level Framing (Priority C fallback — no external signal)
Hi {{first_name}},
Most executives at your stage have at least run the mental math on what it would look like to own something. The ones who end up working with me aren't impulsive — they want to see three paths mapped on one page before they commit to any of them.
I do a one-hour exercise that does exactly that. Want to see what it looks like for your situation?
Kelsey

### Template G – Lead Magnet Offer (soft CTA — works with Priority C or weak B)
> Use when signal is weaker or a lower-commitment first touch makes sense.
Hi {{first_name}},
{{signal_reference}}. I put together a short guide called "5 Things That Actually Determine If Franchise Ownership Makes Sense For You" — based on patterns across the executives I work with. Want me to send you a copy?
Kelsey
`;
