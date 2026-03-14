// ============================================================
// Waypoint Franchise Advisors — Archetype Data Layer
// Research basis: FranNet personality matching, DISC profiles,
// Perplexity franchise industry analysis, validated brand fit data.
// ============================================================

export type ArchetypeId =
  | "educator"
  | "empath"
  | "connector"
  | "operator"
  | "driver"
  | "community_builder"
  | "analyst"
  | "creative";

export interface Archetype {
  id: ArchetypeId;
  name: string;
  tagline: string;
  description: string;
  advisorNote: string;
  emoji: string;
  discProfile: string;
  strongFits: string[];
  weakFits: string[];
  strongFitReason: string;
  weakFitReason: string;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  educator: {
    id: "educator",
    name: "The Educator",
    tagline: "You turn complicated into clear. People follow because of it.",
    description:
      "You naturally break things down. When you explain something, people actually understand it, and that energy keeps you going. You're patient where others get frustrated, structured where others go on instinct, and you get real satisfaction from watching someone grow because you handed them the right tools. You're not just building a business. You're building something you can teach.",
    advisorNote:
      "Educators thrive where the training process IS the competitive advantage. Your ability to develop staff and educate customers is literally the product. I'll point you toward models where the franchisor's curriculum and your natural instruction style build something hard for competitors to copy. The biggest trap for your type: over-explaining the sale. We'll work on that.",
    emoji: "📚",
    discProfile: "S/I",
    strongFits: ["Children's Education & Enrichment", "Senior Care", "Business Services (Consulting/Coaching)", "Home Services"],
    weakFits: ["Food & Beverage (QSR)", "Junk Removal", "Pest Control"],
    strongFitReason:
      "Education and enrichment franchises put your training instincts at the center of delivery. Senior care rewards owners who can develop caregiver competency. Coaching and consulting brands like ActionCOACH are literally built around the Educator's core skill.",
    weakFitReason:
      "QSR, junk removal, and pest control live and die on throughput speed and transactional volume. The Educator's instinct to explain the 'why' behind every step slows execution in these models. The margin for patience is thin.",
  },

  empath: {
    id: "empath",
    name: "The Caregiver",
    tagline: "You built trust before you knew it was a business strategy.",
    description:
      "You read rooms the way other people read spreadsheets. You remember what matters to people: their names, their situations, the thing they mentioned three weeks ago. The people you serve don't just become customers; they become relationships. You're drawn to work that has purpose beyond the transaction, and you bring a kind of loyalty-building that can't be manufactured.",
    advisorNote:
      "Caregivers do well in any business where trust is the product. Senior care, pet services, and children's programs all run on repeat referrals from families who believe you genuinely care. Because they're right. The blind spot I watch for: taking rejection personally. When a family says no or a client leaves, it can hit deeper than it should. We'll make sure the business model has enough room for the emotional complexity of this work.",
    emoji: "🤝",
    discProfile: "S",
    strongFits: ["Senior Care", "Pet Services", "Children's Education & Enrichment", "Medical Wellness"],
    weakFits: ["Junk Removal", "Business Services (B2B Sales)", "Restoration & Cleaning"],
    strongFitReason:
      "Senior care brands explicitly recruit for 'a heart for service.' Your instinct to genuinely care for vulnerable people is their most valuable trait. Pet services runs on the same trust dynamic. Families hand you what they love most and pay a premium for the peace of mind.",
    weakFitReason:
      "Junk removal and high-volume B2B sales require transaction speed and emotional distance from rejection. Restoration work demands cool-headed project management under pressure. These models drain Caregivers rather than energizing them.",
  },

  connector: {
    id: "connector",
    name: "The Connector",
    tagline: "You've never met a stranger. That's a business asset.",
    description:
      "You remember names. You work rooms without trying. Referrals happen naturally because people want to send business to someone they trust, and you've spent your career building that reputation without thinking of it as a strategy. You track relationships the way others track inventory, and you understand instinctively that most businesses are really just networks in disguise.",
    advisorNote:
      "Connectors have a real edge in any business where referral generation is survival. The categories I'll show you have one thing in common: your network IS your pipeline. The risk for your type is that you can lean too hard on relationships and under-invest in systems. The right franchise model gives you the structure so your natural people skill can focus where it creates the most value.",
    emoji: "🌐",
    discProfile: "I",
    strongFits: ["Senior Care", "Beauty & Personal Care", "Business Services (Consulting/Coaching)", "Real Estate & Home Improvement", "Medical Wellness"],
    weakFits: ["Lawn & Landscape", "Pest Control", "Food & Beverage (QSR)"],
    strongFitReason:
      "Senior care and medical wellness live on referral networks: discharge planners, elder law attorneys, physicians. Beauty and personal care builds loyalty through relationships. Real estate is fundamentally a connector's game. These categories reward exactly what you do naturally.",
    weakFitReason:
      "Route-based businesses like lawn care and pest control succeed on operational density and efficiency, not relationship breadth. QSR is transactional by design. These models don't put your strongest asset to work.",
  },

  operator: {
    id: "operator",
    name: "The Operator",
    tagline: "You see the system. Everyone else just sees the chaos.",
    description:
      "You walk into a business and immediately see what's inefficient. You love SOPs, checklists, dispatch software, and P&L discipline. You get frustrated when people 'wing it' and deeply satisfied when a process runs exactly as designed. You're not the visionary. You're the person who makes the vision actually work. And in franchising, that's worth more than almost anything else.",
    advisorNote:
      "Operators are the franchise industry's most reliable success story. The system you're buying into was designed for someone exactly like you. What matters is matching you to a brand where their training and support infrastructure is genuinely strong, not just marketed that way. I'll help you tell the difference and point you toward the categories where process discipline produces the widest margins.",
    emoji: "⚙️",
    discProfile: "C/S",
    strongFits: ["Home Services", "Restoration & Cleaning", "Fitness & Wellness", "Food & Beverage (QSR)", "Lawn & Landscape", "Pest Control"],
    weakFits: ["Real Estate & Home Improvement (Brokerage)", "Entertainment & Events"],
    strongFitReason:
      "Home services, restoration, lawn care, and pest control are process machines. Your instinct to build tight systems, control labor costs, and track utilization metrics is precisely what separates profitable operators from the ones that grind and break even. These categories reward Operators disproportionately.",
    weakFitReason:
      "Real estate brokerage depends on recruiting and managing independent salespeople. It's a people flexibility game that fights your instinct for process standardization. Large-format entertainment requires creative community energy alongside operations, which pulls focus from what you're actually good at.",
  },

  driver: {
    id: "driver",
    name: "The Driver",
    tagline: "No doesn't stop you. It just tells you which way to go next.",
    description:
      "You're comfortable with rejection in a way that most people aren't. Quotas and measurable outcomes feel like oxygen to you. They tell you where you stand and what to do next. You communicate directly, close confidently, and get impatient when relationships take longer to develop than the deal requires. You don't need to love the product to sell it. You need to know it works.",
    advisorNote:
      "Drivers do well in businesses where daily prospecting is the difference between survival and momentum. I'll show you categories where that energy is the fuel, not the exception. The one thing I'll push back on: make sure you're not underestimating what it takes to build the operational side. Drivers sell their way into business and sometimes manage their way out of it. The right franchise system solves that.",
    emoji: "🎯",
    discProfile: "D",
    strongFits: ["Junk Removal", "Real Estate & Home Improvement", "Business Services (B2B Sales)", "Pest Control", "Home Services"],
    weakFits: ["Senior Care", "Children's Education & Enrichment", "Pet Services"],
    strongFitReason:
      "Commercial cleaning and B2B business services owners report 60–80 hours/week of prospecting in Year 1. That's exactly where Drivers thrive. Junk removal and pest control run on high call volume and daily close rates. Real estate brokerage rewards the people who can out-hustle the market.",
    weakFitReason:
      "Senior care and children's programs require patient trust-building with families making emotional decisions. Pet services depends on community goodwill. Drivers can build these businesses, but the pace of relationship development frustrates the 'get to the close' instinct.",
  },

  community_builder: {
    id: "community_builder",
    name: "The Community Builder",
    tagline: "You don't just run a business. You create a place people belong.",
    description:
      "You know everyone. You organize the events, chair the committee, remember the fundraiser. People follow your energy because you make them feel like they're part of something. Your marketing doesn't feel like marketing. It feels like an invitation. And the businesses that work best for you are the ones where your local presence and genuine community investment IS the competitive moat.",
    advisorNote:
      "Community Builders are strong in local-market businesses where the owner's personality becomes the brand. Boutique fitness studios, children's programs, and pet services are all categories where the founding member community you create in Year 1 becomes the referral network that carries you through Year 3. The risk: you'll spend time on community when the business needs operations attention. I'll help you balance both.",
    emoji: "🏘️",
    discProfile: "S/I",
    strongFits: ["Fitness & Wellness", "Children's Education & Enrichment", "Pet Services", "Beauty & Personal Care", "Entertainment & Events"],
    weakFits: ["Business Services (B2B Sales)", "Pest Control", "Junk Removal"],
    strongFitReason:
      "Boutique fitness success is tied directly to 'founding member' community energy. Your natural ability to create belonging is the product. Children's enrichment and pet services both rely on word-of-mouth within tight-knit parent and pet-owner communities where your authentic local presence builds on itself over time.",
    weakFitReason:
      "B2B services, pest control, and junk removal are efficiency and prospecting businesses. The energy you put into community events and relationship cultivation doesn't translate as directly into revenue in these models, and the daily grind can feel disconnected from your natural strengths.",
  },

  analyst: {
    id: "analyst",
    name: "The Analyst",
    tagline: "You need the numbers to work before you move. That instinct will protect you.",
    description:
      "You build the model before you believe the pitch. You ask 'what's the data?' before 'what do you think?' You find patterns other people miss, and you're deeply skeptical of vibes-based decision-making. In franchising, this makes you one of the safer candidates. You'll do the due diligence that protects you from bad brands and bad territory decisions. You're not risk-averse. You're risk-disciplined.",
    advisorNote:
      "Analysts tend to make the best franchise investment decisions. Not because they move fastest, but because they verify everything. I'll give you the Item 19 data, the franchisee validation conversations, and the territory analysis you need to make a confident call. The trap for your type: analysis paralysis. At some point the model has to be good enough to start. I'll help you find that line.",
    emoji: "📊",
    discProfile: "C",
    strongFits: ["Restoration & Cleaning", "Medical Wellness", "Food & Beverage (QSR)", "Lawn & Landscape", "Pest Control", "Pool & Outdoor"],
    weakFits: ["Entertainment & Events", "Real Estate & Home Improvement (Brokerage)", "Senior Care (emotional complexity)"],
    strongFitReason:
      "Restoration franchises (water damage, fire, mold) live on Xactimate estimating accuracy, insurance claim discipline, and job cost control. All Analyst strengths. Medical wellness requires meticulous HIPAA, compliance, and financial modeling. QSR franchise success drops significantly without strong cost discipline. These are the categories where your rigor pays dividends.",
    weakFitReason:
      "Large entertainment concepts require intuitive community energy and experience design that goes beyond what data alone can drive. Real estate brokerage succeeds on agent relationship fluidity. Senior care's emotional complexity can be hard to systematize, which frustrates the Analyst's instinct to resolve everything with a better process.",
  },

  creative: {
    id: "creative",
    name: "The Creative",
    tagline: "You see what it could be. Then you build it.",
    description:
      "You think visually. You notice the design before the price, the experience before the product, the story before the pitch. You're trend-aware, platform-native, and you understand instinctively what makes something worth talking about. You don't settle for 'good enough' when you know it could be remarkable. In franchising, that instinct is a real marketing advantage in the right category.",
    advisorNote:
      "Creatives do well in categories where brand experience IS the differentiation. Beauty, fitness, and entertainment businesses live on Instagram and word-of-mouth, and your instinct to create something worth sharing is exactly what the franchisor's marketing playbook is missing at the local level. The risk: make sure operations don't suffer while you're optimizing the aesthetic. We'll talk about how to protect both.",
    emoji: "🎨",
    discProfile: "I",
    strongFits: ["Beauty & Personal Care", "Fitness & Wellness (Boutique)", "Entertainment & Events", "Children's Education & Enrichment"],
    weakFits: ["Lawn & Landscape", "Pest Control", "Junk Removal", "Restoration & Cleaning"],
    strongFitReason:
      "Beauty franchise success ties directly to Instagram engagement. Your visual instincts are a direct revenue driver. Boutique fitness studios succeed when the opening-week social energy you create converts to founding memberships. Entertainment concepts live on experience design, which is where Creatives are most at home.",
    weakFitReason:
      "Pest control, lawn care, junk removal, and restoration are operational efficiency businesses. There's no experience to design, no brand story to build locally, no visual identity to differentiate. These models reward discipline and volume, and they tend to grind the Creative's energy down over time.",
  },
};

// ============================================================
// Industry Definitions
// Source: Perplexity franchise industry analysis + FranChoice data
// ============================================================

export interface Industry {
  name: string;
  shortDescription: string;
  investmentRange: string;
  topFits: ArchetypeId[];
  poorFits: ArchetypeId[];
}

export const INDUSTRIES: Industry[] = [
  {
    name: "Senior Care",
    shortDescription: "Non-medical in-home care for aging adults",
    investmentRange: "$90K–$430K",
    topFits: ["empath", "connector", "community_builder"],
    poorFits: ["driver", "analyst"],
  },
  {
    name: "Home Services",
    shortDescription: "Handyman, plumbing, cleaning, HVAC, renovation",
    investmentRange: "$55K–$507K",
    topFits: ["operator", "driver"],
    poorFits: ["creative", "empath"],
  },
  {
    name: "Restoration & Cleaning",
    shortDescription: "Water, fire, mold restoration + carpet/floor cleaning",
    investmentRange: "$70K–$511K",
    topFits: ["operator", "analyst"],
    poorFits: ["empath", "creative"],
  },
  {
    name: "Beauty & Personal Care",
    shortDescription: "Hair, wax, skincare, massage, barbershops",
    investmentRange: "$188K–$1,010K",
    topFits: ["connector", "creative", "community_builder"],
    poorFits: ["driver", "analyst"],
  },
  {
    name: "Fitness & Wellness",
    shortDescription: "Boutique studios, gyms, membership-based fitness",
    investmentRange: "$100K–$1,850K",
    topFits: ["operator", "community_builder", "creative"],
    poorFits: ["analyst", "empath"],
  },
  {
    name: "Children's Education & Enrichment",
    shortDescription: "Tutoring, swim schools, STEM, art, sports programs",
    investmentRange: "$65K–$1,310K",
    topFits: ["educator", "community_builder"],
    poorFits: ["driver", "analyst"],
  },
  {
    name: "Pet Services",
    shortDescription: "Daycare, boarding, grooming, training",
    investmentRange: "$50K–$2,040K",
    topFits: ["empath", "operator", "community_builder"],
    poorFits: ["driver", "analyst"],
  },
  {
    name: "Business Services",
    shortDescription: "B2B printing, signage, coaching, consulting, staffing",
    investmentRange: "$50K–$403K",
    topFits: ["connector", "educator", "driver"],
    poorFits: ["empath", "creative"],
  },
  {
    name: "Food & Beverage",
    shortDescription: "QSR, fast casual, smoothies, coffee, desserts",
    investmentRange: "$100K–$7,200K",
    topFits: ["operator", "driver"],
    poorFits: ["educator", "creative"],
  },
  {
    name: "Lawn & Landscape",
    shortDescription: "Lawn treatment, fertilization, commercial maintenance",
    investmentRange: "$55K–$325K",
    topFits: ["operator", "analyst"],
    poorFits: ["creative", "empath"],
  },
  {
    name: "Pool & Outdoor",
    shortDescription: "Pool maintenance, outdoor living, holiday lighting",
    investmentRange: "$20K–$837K",
    topFits: ["operator", "connector"],
    poorFits: ["creative", "empath"],
  },
  {
    name: "Real Estate & Home Improvement",
    shortDescription: "Brokerages, budget blinds, kitchen/floor remodeling",
    investmentRange: "$16K–$512K",
    topFits: ["connector", "driver"],
    poorFits: ["operator", "empath"],
  },
  {
    name: "Junk Removal",
    shortDescription: "Residential and commercial debris hauling",
    investmentRange: "$30K–$481K",
    topFits: ["driver", "operator"],
    poorFits: ["empath", "creative"],
  },
  {
    name: "Pest Control",
    shortDescription: "Mosquito, tick, and general pest treatment programs",
    investmentRange: "$50K–$220K",
    topFits: ["operator", "driver", "analyst"],
    poorFits: ["empath", "creative"],
  },
  {
    name: "Medical Wellness",
    shortDescription: "IV therapy, med spas, chiropractic, cryotherapy",
    investmentRange: "$147K–$1,300K",
    topFits: ["connector", "analyst"],
    poorFits: ["driver", "educator"],
  },
  {
    name: "Entertainment & Events",
    shortDescription: "Trampoline parks, pickleball, painting studios, bowling",
    investmentRange: "$119K–$8,300K",
    topFits: ["creative", "community_builder"],
    poorFits: ["operator", "analyst"],
  },
];

// ============================================================
// Quiz Questions & Scoring
// ============================================================

export interface QuizOption {
  label: string;
  scores: Partial<Record<ArchetypeId, number>>;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "energy_source",
    question: "At the end of a long day, what kind of work actually left you energized?",
    options: [
      {
        label: "Training someone who finally understood something difficult",
        scores: { educator: 4, community_builder: 1 },
      },
      {
        label: "Helping someone through a hard situation — and knowing it meant something",
        scores: { empath: 4, community_builder: 1 },
      },
      {
        label: "A conversation that turned into a relationship, a referral, or an opportunity",
        scores: { connector: 4, driver: 1 },
      },
      {
        label: "Finishing a process that now runs better than it did yesterday",
        scores: { operator: 4, analyst: 1 },
      },
      {
        label: "Closing something — hitting a number, finishing a deal, winning a pitch",
        scores: { driver: 4, operator: 1 },
      },
      {
        label: "Bringing people together around something I organized or created",
        scores: { community_builder: 4, connector: 1 },
      },
      {
        label: "Solving a problem with data that nobody else thought to look at",
        scores: { analyst: 4, operator: 1 },
      },
      {
        label: "Making something look, feel, or sound better than it did before",
        scores: { creative: 4, community_builder: 1 },
      },
    ],
  },
  {
    id: "strength",
    question: "Other people consistently come to you for...",
    options: [
      {
        label: "Explaining or simplifying something complicated",
        scores: { educator: 4, analyst: 1 },
      },
      {
        label: "Listening without judgment and giving thoughtful support",
        scores: { empath: 4, community_builder: 1 },
      },
      {
        label: "Introductions — \"you should meet so-and-so\"",
        scores: { connector: 4, community_builder: 1 },
      },
      {
        label: "Making something run smoother or more consistently",
        scores: { operator: 4, analyst: 1 },
      },
      {
        label: "Honest, direct advice — even when it's not what they want to hear",
        scores: { driver: 3, analyst: 2 },
      },
      {
        label: "Knowing what's happening in the community, who to call, how to get involved",
        scores: { community_builder: 4, connector: 2 },
      },
      {
        label: "Finding the pattern or the number that changes the decision",
        scores: { analyst: 4, operator: 1 },
      },
      {
        label: "Making things look and feel right — design, story, experience",
        scores: { creative: 4, community_builder: 1 },
      },
    ],
  },
  {
    id: "discomfort",
    question: "What kind of work makes you quietly dread showing up?",
    options: [
      {
        label: "Cold outreach or aggressive quota pressure",
        scores: { educator: 2, empath: 2, analyst: 1 },
      },
      {
        label: "High-conflict situations or environments where people don't care",
        scores: { empath: 3, educator: 1, community_builder: 1 },
      },
      {
        label: "Solitary technical work with minimal human interaction",
        scores: { connector: 3, community_builder: 2 },
      },
      {
        label: "Unstructured chaos where nothing is documented or repeatable",
        scores: { operator: 3, analyst: 2 },
      },
      {
        label: "Long, slow processes where results take months to materialize",
        scores: { driver: 3, creative: 1 },
      },
      {
        label: "Anonymous corporate environments where nobody knows each other",
        scores: { community_builder: 3, connector: 2 },
      },
      {
        label: "Decisions made on gut feel with no data to validate them",
        scores: { analyst: 3, operator: 2 },
      },
      {
        label: "Repetitive execution with no room to improve or differentiate",
        scores: { creative: 3, empath: 1 },
      },
    ],
  },
  {
    id: "people_style",
    question: "How do you naturally operate with the people around you?",
    options: [
      {
        label: "I develop people — I invest in their growth and capability",
        scores: { educator: 3, empath: 2, community_builder: 1 },
      },
      {
        label: "I read people — I know what they need before they say it",
        scores: { empath: 4, connector: 1, community_builder: 1 },
      },
      {
        label: "I connect people — I'm always making introductions and building bridges",
        scores: { connector: 4, community_builder: 2 },
      },
      {
        label: "I manage people — I'm clear about expectations and hold them to it",
        scores: { operator: 3, driver: 2 },
      },
      {
        label: "I persuade people — I'm direct and I move them toward a decision",
        scores: { driver: 4, connector: 1 },
      },
      {
        label: "I mobilize people — I create the group energy that makes things happen",
        scores: { community_builder: 4, connector: 1 },
      },
      {
        label: "I advise people — I bring the analysis that makes decisions defensible",
        scores: { analyst: 4, educator: 1 },
      },
      {
        label: "I inspire people — I create things worth being excited about",
        scores: { creative: 3, community_builder: 2 },
      },
    ],
  },
  {
    id: "rejection",
    question: "When something doesn't work — a prospect says no, a plan fails — what happens for you?",
    options: [
      {
        label: "I immediately want to understand why so I can improve the approach",
        scores: { educator: 3, analyst: 2 },
      },
      {
        label: "I take it personally, especially if a relationship was involved",
        scores: { empath: 3, community_builder: 2 },
      },
      {
        label: "I start working my network to find another way in",
        scores: { connector: 4, driver: 1 },
      },
      {
        label: "I figure out what broke in the process and fix it",
        scores: { operator: 4, analyst: 1 },
      },
      {
        label: "I move on fast — 'no' just tells me where to go next",
        scores: { driver: 4, operator: 1 },
      },
      {
        label: "I check in on the team and make sure the group is still motivated",
        scores: { community_builder: 3, empath: 2 },
      },
      {
        label: "I go back to the data to figure out what I missed",
        scores: { analyst: 4, operator: 1 },
      },
      {
        label: "I look for a more compelling angle or a better way to tell the story",
        scores: { creative: 3, connector: 1 },
      },
    ],
  },
  {
    id: "metrics",
    question: "If you owned a business, what number would you wake up thinking about?",
    options: [
      {
        label: "How many people on my team got better this week",
        scores: { educator: 4, empath: 1 },
      },
      {
        label: "Client satisfaction — are the people we serve actually happy?",
        scores: { empath: 4, community_builder: 1 },
      },
      {
        label: "New referrals and active relationships in my network",
        scores: { connector: 4, driver: 1 },
      },
      {
        label: "Labor percentage, utilization rate, cost per job",
        scores: { operator: 3, analyst: 3 },
      },
      {
        label: "Revenue, close rate, pipeline velocity",
        scores: { driver: 4, analyst: 1 },
      },
      {
        label: "Community engagement — reviews, events, word of mouth",
        scores: { community_builder: 4, connector: 1 },
      },
      {
        label: "Profit margin, cash flow, and return on invested capital",
        scores: { analyst: 4, operator: 1 },
      },
      {
        label: "Brand perception — how does the market see us?",
        scores: { creative: 4, connector: 1 },
      },
    ],
  },
  {
    id: "background",
    question: "When you look back at your career, which chapter fits best?",
    options: [
      {
        label: "I taught, trained, coached, or built curriculum at some point",
        scores: { educator: 4, community_builder: 1 },
      },
      {
        label: "I worked in healthcare, social work, caregiving, or counseling",
        scores: { empath: 4, educator: 1 },
      },
      {
        label: "I was in sales, business development, or account management",
        scores: { connector: 2, driver: 3 },
      },
      {
        label: "I ran operations — managed teams, owned P&Ls, built processes",
        scores: { operator: 4, analyst: 1 },
      },
      {
        label: "I was in enterprise sales, B2B, or high-ticket closing",
        scores: { driver: 4, connector: 1 },
      },
      {
        label: "I was community-facing — nonprofit, chamber, local government, events",
        scores: { community_builder: 4, connector: 1 },
      },
      {
        label: "I was in finance, analysis, or strategy",
        scores: { analyst: 4, operator: 1 },
      },
      {
        label: "I was in marketing, design, media, or brand",
        scores: { creative: 4, connector: 1 },
      },
    ],
  },
  {
    id: "ownership_vision",
    question: "When you imagine yourself three years into owning a franchise, what does the good version look like?",
    options: [
      {
        label: "I've built a great team — people who grew because of how I developed them",
        scores: { educator: 4, community_builder: 1 },
      },
      {
        label: "I have clients who've been with me from the start and genuinely trust me",
        scores: { empath: 4, connector: 1 },
      },
      {
        label: "I'm known in my market — everyone refers to me because of the relationships I've built",
        scores: { connector: 4, community_builder: 1 },
      },
      {
        label: "The operation runs like a machine — consistent, scalable, and profitable",
        scores: { operator: 4, analyst: 1 },
      },
      {
        label: "I've hit my revenue targets and I'm thinking about what to open next",
        scores: { driver: 4, operator: 1 },
      },
      {
        label: "I've created something people feel genuinely proud to be part of",
        scores: { community_builder: 4, creative: 1 },
      },
      {
        label: "My unit economics are dialed in and I'm investing the returns elsewhere",
        scores: { analyst: 4, operator: 1 },
      },
      {
        label: "My brand stands out locally — better experience, stronger story, more talked about",
        scores: { creative: 4, connector: 1 },
      },
    ],
  },
];

// ============================================================
// Scoring Engine
// ============================================================

export function calculateArchetype(selectedOptions: QuizOption[]): ArchetypeId {
  const totals: Record<ArchetypeId, number> = {
    educator: 0,
    empath: 0,
    connector: 0,
    operator: 0,
    driver: 0,
    community_builder: 0,
    analyst: 0,
    creative: 0,
  };

  for (const option of selectedOptions) {
    for (const [archetype, score] of Object.entries(option.scores)) {
      totals[archetype as ArchetypeId] += score;
    }
  }

  return (Object.entries(totals).sort(([, a], [, b]) => b - a)[0][0]) as ArchetypeId;
}
