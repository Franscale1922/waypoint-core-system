// ============================================================
// Waypoint Franchise Advisors — Archetype Data Layer
// ============================================================
// This file is the single source of truth for the personality
// archetype quiz. Edit archetypes, industries, and questions here.
// ============================================================

export type ArchetypeId =
  | "builder"
  | "operator"
  | "investor"
  | "escape_artist"
  | "explorer"
  | "maximizer";

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  description: string;
  /** Kelsey's first-person framing for the result screen */
  advisorNote: string;
  emoji: string;
  strongFits: string[];
  weakFits: string[];
  strongFitReason: string;
  weakFitReason: string;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  builder: {
    id: "builder",
    name: "The Builder",
    tagline: "You're not buying a job. You're planting a tree.",
    description:
      "You think in decades, not quarters. The business you want to own isn't just an income stream — it's a legacy asset. You're willing to put in the hard early years because you have a clear picture of what you're building toward. You're not looking for the fastest path; you're looking for the right one.",
    advisorNote:
      "Builders do best when they choose a brand with genuine long-term staying power — strong validation from existing franchisees and a category that will still be relevant in 20 years. I'll steer you toward models where early-stage effort translates into compounding value.",
    emoji: "🏗️",
    strongFits: ["Senior Care & Healthcare", "B2B Services", "Education & Childcare", "Home Services"],
    weakFits: ["Fitness & Wellness", "Food & Beverage (QSR)"],
    strongFitReason:
      "These categories reward patience and relationship-building. Recurring clients, strong franchisee retention, and real community ties — that's where Builders compound.",
    weakFitReason:
      "High-trend categories with fickle consumer demand and labor-heavy day-to-day can frustrate a Builder's long-view orientation. The timeline for profitability often conflicts with the personal investment required.",
  },

  operator: {
    id: "operator",
    name: "The Operator",
    tagline: "Give me a proven system and I'll run it better than anyone.",
    description:
      "You thrive inside structure. You're not the idea person — you're the person who makes ideas actually work. You want documented processes, clear KPIs, and a team you can develop. Chaos isn't exciting to you; efficiency is. The best franchise for you is one that has already figured out the playbook, because you'll execute it without skipping steps.",
    advisorNote:
      "Operators are the franchise industry's most reliable success story. The key is matching you to a brand where their training and support infrastructure is genuinely strong, not just marketed as such. I'll help you separate the real operators from the brands that sell the idea of a system.",
    emoji: "⚙️",
    strongFits: ["Home Services", "Automotive", "Food & Beverage (QSR)", "Senior Care & Healthcare"],
    weakFits: ["Technology / IT Services", "Staffing & Placement"],
    strongFitReason:
      "Operators shine in service delivery businesses with repeatable day-to-day workflows, local market ownership, and team-based execution. These categories reward consistency above creativity.",
    weakFitReason:
      "Categories that require high adaptability, fluid sales cycles, or B2B consulting dynamics can feel structureless to an Operator — leading to frustration when the playbook isn't as clear as promised.",
  },

  investor: {
    id: "investor",
    name: "The Investor",
    tagline: "You want a return. That's not greed — that's math.",
    description:
      "You look at franchise ownership the way you'd look at any capital deployment: through a lens of risk-adjusted return. You're comfortable delegating management, you've done your due diligence on other assets, and you want to know if a franchise can generate a meaningful return without you being the one opening and closing every day. You probably have other income or assets already.",
    advisorNote:
      "The investor profile is common, and the traps are real. Semi-absentee works when the brand has a strong GM hire profile, validated AUV data, and a territory setup that supports it. I'll point you toward the models where the Investor math actually works — and away from the ones where it's just marketed to sound like it does.",
    emoji: "📊",
    strongFits: ["B2B Services", "Staffing & Placement", "Technology / IT Services", "Retail / Brick-and-Mortar"],
    weakFits: ["Senior Care & Healthcare", "Fitness & Wellness"],
    strongFitReason:
      "B2B models and staffing franchises often have strong unit economics with a capable GM structure that allows real semi-absentee operation. The client relationships compound. Retail works for multi-unit investors with capital reserves.",
    weakFitReason:
      "Senior care requires genuine owner engagement to protect quality of care. Fitness wellness trends cycle quickly and demand high owner presence — the Investor model fights the business model in these categories.",
  },

  escape_artist: {
    id: "escape_artist",
    name: "The Escape Artist",
    tagline: "The W2 life doesn't fit anymore. It's time to build your own.",
    description:
      "You've hit a wall — a layoff, a ceiling, or just a slow-building certainty that you can't do this for another 10 years. You want out of the corporate structure with its politics and its performance reviews and its income cap. Franchise ownership appeals because it's structured enough to feel safe, but it's yours. You're motivated, a little impatient, and ready to move.",
    advisorNote:
      "The Escape Artist is one of my most motivated client profiles — and the one I watch most carefully for urgency bias. When someone really wants out, they can rush toward the first exciting thing rather than the right thing. I'll make sure your energy is pointed at a model with a realistic ramp timeline and first-year economics that match your situation.",
    emoji: "🔓",
    strongFits: ["Home Services", "Fitness & Wellness", "B2B Services"],
    weakFits: ["Retail / Brick-and-Mortar", "Food & Beverage (QSR)", "Staffing & Placement"],
    strongFitReason:
      "Home services and B2B models have lower barriers to first revenue and a realistic path to owner income in Year 1 or early Year 2 — important for someone who needs their business to replace a salary on a real timeline.",
    weakFitReason:
      "Retail and QSR have high build-out costs, longer ramp windows, and depend heavily on foot traffic and location strategy. For someone focused on replacing W2 income quickly, those timelines can create serious pressure.",
  },

  explorer: {
    id: "explorer",
    name: "The Explorer",
    tagline: "You want all the information before you make a move. That's not a weakness.",
    description:
      "You've been thinking about this for a while. You read everything, you've done the searches, you've probably looked at five different business models and still feel like you need more data before you commit. You're not risk-averse — you're risk-aware, and that's different. You want to feel confident, not just excited. The right franchise for you is one where the due diligence process gives you the clarity to actually pull the trigger.",
    advisorNote:
      "Explorers often become my best-prepared candidates once they find a process that gives them real answers — not sales pitches. My job with you isn't to rush you; it's to point you toward brands where Validation Calls with actual franchisees will give you the confidence to move. If you can't get excited after talking to real owners, it's not the right fit.",
    emoji: "🔭",
    strongFits: ["Education & Childcare", "Home Services", "Senior Care & Healthcare"],
    weakFits: ["Food & Beverage (QSR)", "Automotive"],
    strongFitReason:
      "Categories with strong franchisee communities and transparent FDD data reward the Explorer's research mindset. Mission-driven categories like education and senior care often have long-tenured franchisees who give straightforward validation answers.",
    weakFitReason:
      "High-capital, location-dependent concepts like QSR require a willingness to commit before having perfect information. Explorers can find the research loop difficult to close in categories where the real data only comes after signing.",
  },

  maximizer: {
    id: "maximizer",
    name: "The Maximizer",
    tagline: "You've already built something. Now you want to scale.",
    description:
      "You're not new to this. You've run a team, managed a P&L, maybe owned a business before. You understand operations, you're comfortable with risk, and you're looking at franchise ownership as a portfolio addition — a way to multiply what you've already built. You want a brand that can support multi-unit expansion and a structure that leverages your experience rather than ignoring it.",
    advisorNote:
      "Maximizers are my most sophisticated clients — which also means they're the most likely to underestimate how different a franchise system is from what they've built before. The best match for you is a brand with a strong multi-unit development agreement, room for territorial expansion, and support infrastructure that scales. I'll help you find the ones where your experience is an asset, not a liability.",
    emoji: "⚡",
    strongFits: ["B2B Services", "Retail / Brick-and-Mortar", "Staffing & Placement", "Food & Beverage (QSR)"],
    weakFits: ["Education & Childcare", "Fitness & Wellness"],
    strongFitReason:
      "Multi-unit B2B, staffing, and retail concepts reward the Maximizer's operational sophistication and capital position. These categories have proven multi-unit pathways and the kind of market complexity that experienced operators navigate well.",
    weakFitReason:
      "Education and wellness franchises often prioritize owner passion and community presence over operational scale — which can feel limiting to a Maximizer whose instinct is to grow quickly and systematically.",
  },
};

// ============================================================
// Quiz Questions & Scoring
// ============================================================

export interface QuizOption {
  label: string;
  /** Partial score contribution toward each archetype */
  scores: Partial<Record<ArchetypeId, number>>;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "work_style",
    question: "When you're doing your best work, what does that look like?",
    options: [
      {
        label: "Leading a team toward a goal I've defined",
        scores: { builder: 3, maximizer: 2 },
      },
      {
        label: "Running a tight operation where every step is dialed in",
        scores: { operator: 3, maximizer: 1 },
      },
      {
        label: "Reviewing performance data and making strategic decisions",
        scores: { investor: 3, maximizer: 2 },
      },
      {
        label: "Working independently without a lot of bureaucracy",
        scores: { escape_artist: 3, explorer: 1 },
      },
      {
        label: "Researching, planning, and getting the details exactly right",
        scores: { explorer: 3, builder: 1 },
      },
    ],
  },
  {
    id: "motivation",
    question: "What would owning a successful franchise actually mean for you?",
    options: [
      {
        label: "Leaving something for my family — an asset that outlasts me",
        scores: { builder: 4, operator: 1 },
      },
      {
        label: "Never having to answer to someone else about my income",
        scores: { escape_artist: 4, operator: 1 },
      },
      {
        label: "A return that makes the capital work harder than it does anywhere else",
        scores: { investor: 4, maximizer: 2 },
      },
      {
        label: "Proving to myself that I can build something on my own",
        scores: { escape_artist: 2, explorer: 2, builder: 1 },
      },
      {
        label: "Adding income streams to a portfolio I'm already building",
        scores: { maximizer: 4, investor: 2 },
      },
    ],
  },
  {
    id: "involvement",
    question: "How involved do you want to be in the day-to-day operation?",
    options: [
      {
        label: "Fully hands-on, at least early on — I want to learn every part of it",
        scores: { operator: 4, builder: 1, escape_artist: 1 },
      },
      {
        label: "Present owner, but building toward a team that runs it without me",
        scores: { builder: 3, maximizer: 2, operator: 1 },
      },
      {
        label: "I want a strong manager in place fairly quickly — I check in, I don't run it",
        scores: { investor: 4, maximizer: 2 },
      },
      {
        label: "As minimal as possible — I have other commitments",
        scores: { investor: 3, maximizer: 1 },
      },
    ],
  },
  {
    id: "team",
    question: "How do you feel about hiring and managing employees?",
    options: [
      {
        label: "I've built and led teams — it's one of my strengths",
        scores: { builder: 2, operator: 2, maximizer: 3 },
      },
      {
        label: "I can do it, but I'd rather hire a general manager to handle it",
        scores: { investor: 3, maximizer: 2 },
      },
      {
        label: "I'm comfortable with it but I haven't done it at scale",
        scores: { operator: 2, escape_artist: 2, explorer: 1 },
      },
      {
        label: "I'm a solo contributor by nature — lean team is better",
        scores: { escape_artist: 3, investor: 1 },
      },
    ],
  },
  {
    id: "risk",
    question: "When you think about putting capital into a business, what's your honest reaction?",
    options: [
      {
        label: "This is a long-term commitment — I'm prepared to weather the early years",
        scores: { builder: 4, operator: 1 },
      },
      {
        label: "I've modeled it carefully — the numbers have to work within a defined window",
        scores: { investor: 4, explorer: 2 },
      },
      {
        label: "I need to replace my income, so the ramp timeline matters a lot",
        scores: { escape_artist: 4, operator: 1 },
      },
      {
        label: "I want more information before I get comfortable committing",
        scores: { explorer: 4, escape_artist: 1 },
      },
      {
        label: "I have experience with this — capital deployment is not new to me",
        scores: { maximizer: 4, investor: 2 },
      },
    ],
  },
  {
    id: "timeline",
    question: "What does your timeline look like?",
    options: [
      {
        label: "I want to be open within 6 months — I'm ready to move",
        scores: { escape_artist: 3, operator: 1 },
      },
      {
        label: "6 to 12 months — I want to do this right, not fast",
        scores: { builder: 2, operator: 2, explorer: 2 },
      },
      {
        label: "12 to 24 months — I'm building toward this deliberately",
        scores: { builder: 3, investor: 2, maximizer: 1 },
      },
      {
        label: "I don't have a hard deadline — I'm doing my research",
        scores: { explorer: 4, investor: 1 },
      },
    ],
  },
  {
    id: "background",
    question: "What's your professional background?",
    options: [
      {
        label: "Corporate management — I've run teams, budgets, and P&Ls",
        scores: { operator: 3, builder: 2, maximizer: 2 },
      },
      {
        label: "Sales or business development",
        scores: { escape_artist: 2, operator: 2, maximizer: 2 },
      },
      {
        label: "Finance, analysis, or investment",
        scores: { investor: 4, explorer: 1, maximizer: 2 },
      },
      {
        label: "Business owner or entrepreneur (past or present)",
        scores: { maximizer: 4, builder: 2, investor: 1 },
      },
      {
        label: "Service, healthcare, education, or skilled trades",
        scores: { operator: 2, builder: 2, explorer: 2 },
      },
    ],
  },
  {
    id: "fear",
    question: "What's your honest biggest concern about this?",
    options: [
      {
        label: "Putting my family's financial security at risk",
        scores: { explorer: 2, builder: 1 },
      },
      {
        label: "Trading one kind of trap for another — still not free",
        scores: { escape_artist: 2, investor: 1 },
      },
      {
        label: "Not having the right skills to actually run it",
        scores: { explorer: 2, escape_artist: 1 },
      },
      {
        label: "Choosing the wrong brand and being locked in",
        scores: { explorer: 3, builder: 1 },
      },
      {
        label: "Honestly, my biggest fear is doing nothing and being in the same place in 3 years",
        scores: { escape_artist: 3, maximizer: 1, operator: 1 },
      },
    ],
  },
];

// ============================================================
// Scoring Engine
// ============================================================

/**
 * Takes an array of selected option objects and returns the winning archetype.
 * In the event of a tie, the first tied archetype in the defined order wins.
 */
export function calculateArchetype(
  selectedOptions: QuizOption[]
): ArchetypeId {
  const totals: Record<ArchetypeId, number> = {
    builder: 0,
    operator: 0,
    investor: 0,
    escape_artist: 0,
    explorer: 0,
    maximizer: 0,
  };

  for (const option of selectedOptions) {
    for (const [archetype, score] of Object.entries(option.scores)) {
      totals[archetype as ArchetypeId] += score;
    }
  }

  // Return the archetype with the highest score
  return (Object.entries(totals).sort(
    ([, a], [, b]) => b - a
  )[0][0]) as ArchetypeId;
}
