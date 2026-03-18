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

CLOSING RULES — low pressure only
"Worth a conversation?" / "Would it be worth 15 minutes to find out?" / "Curious if that's even a thought."
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
### Template A – Company Event / WARN Act / Reorg (Priority A signal)
Hi {{first_name}},
With {{company_news_event}}, the mandates for a lot of operations leaders are getting redrawn right now. Usually when that happens, the directors and VPs who've been holding things together start quietly running parallel plans.
I help people in your position figure out if franchise ownership is a realistic alternative — or just a tempting distraction. If that's even a 10% thought, worth a conversation.
Kelsey

### Template B – LinkedIn Post / Burnout / Leadership Signal (Priority B signal)
Hi {{first_name}},
{{post_topic_paraphrase}}. That's the inflection point I hear from most of the operations and finance leaders I work with right before they start taking franchise ownership seriously.
I'm not a recruiter. My job is to help people figure out if owning something makes sense for their actual situation — or not. Worth a quick conversation to find out?
Kelsey

### Template C – Sales Leader / Comp Ceiling (Priority B signal)
Hi {{first_name}},
{{post_topic_paraphrase}}. Sounds like you've run the numbers on where your current trajectory tops out.
I work with directors and VPs who want to understand what building equity in their own business would look like, starting from a realistic picture of their capital and risk tolerance. No pitch — just a real look at the math. Would that be useful?
Kelsey

### Template D – Finance / Risk-Oriented (either signal, analytical framing)
Hi {{first_name}},
{{signal_reference}}. The people who end up working with me are usually the cautious ones — they want to see what the cash flows, downside, and exit actually look like before they decide anything.
I can't promise no risk. But I can walk you through a few models in a way that would make sense to a finance brain. Worth 15 minutes to look at it together?
Kelsey

### Template E – Layoff / Open to Work (Priority A: WARN or public announcement)
Hi {{first_name}},
{{company_news_event}} strips away the golden handcuffs faster than anything else. Some of the people I work with used that window to seriously evaluate owning something for the first time.
If you want a straight conversation about what that path actually looks like — no pressure, no decision needed — I'm happy to make time.
Kelsey

### Template F – Role-Level Framing (Priority C fallback — no specific data)
Hi {{first_name}},
After a long run in {{function}} leadership, most people have at least thought about what it would look like to run their own thing. The ones who end up working with me aren't reckless — they're the ones who want to see the real numbers before they decide.
I run a one-hour exercise that maps three paths on one page: stay the course, make a strategic move, or step into ownership. Want to see what it looks like for your situation?
Kelsey
`;
