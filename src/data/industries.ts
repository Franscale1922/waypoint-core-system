// Franchise industry/category data: single source of truth.
// Consumed by the /industries hub page and the /industries/[slug] category pages.
// Category names mirror the Service OfferCatalog in src/app/lib/structured-data.ts and
// the checklist slugs in the /checklists page so internal links resolve cleanly.
//
// FTC note: copy here is educational only, no earnings claims, no income projections,
// no promises of approval or results.

export type IndustryFaq = { q: string; a: string };
export type IndustryArticle = { slug: string; title: string };

export type Industry = {
  slug: string;          // URL segment under /industries/
  name: string;          // full display name, e.g. "Home Services"
  navLabel: string;      // short label for nav/footer
  metaTitle: string;
  metaDescription: string;
  heroTagline: string;   // one-line positioning under the H1
  intro: string;         // opening paragraph
  whatItIs: string;      // what the category actually is
  whoItFits: string;     // the kind of owner it tends to suit
  watchFor: string;      // honest tradeoffs / due-diligence cautions
  checklistSlug?: string; // anchors to /checklists#checklist-<checklistSlug>; omit if no category-specific checklist exists
  faqs: IndustryFaq[];
  relatedArticles: IndustryArticle[];
};

export const industries: Industry[] = [
  {
    slug: "home-services",
    name: "Home Services",
    navLabel: "Home Services",
    metaTitle: "Home Services Franchises: What the Category Is Really Like",
    metaDescription:
      "An honest look at home services franchises: what the category covers, who it tends to fit, the tradeoffs to watch, and the brands and questions worth your time.",
    heroTagline: "Recurring, need-based demand with low real-estate overhead, and a heavy reliance on hiring.",
    intro:
      "Home services is one of the most overlooked categories in franchising, partly because the work is unglamorous. Painting, cleaning, plumbing, restoration, lawn care, garage doors, and the rest are not exciting at a dinner party. But demand tends to be durable: homes break and need maintenance regardless of the economy, and much of the work is repeat or referral business.",
    whatItIs:
      "Most home services franchises are van-based or light-footprint operations rather than expensive retail build-outs. That keeps real-estate and fit-out costs lower than food or fitness. The business is built on dispatching trained technicians, marketing locally, and managing the schedule. The owner's job is usually recruiting, sales, and operations management, not swinging a hammer.",
    whoItFits:
      "It tends to suit people who are comfortable building and leading a team of field technicians, who can stay close to local marketing, and who do not need a prestigious storefront to feel like a business owner. Many successful owners come from management or sales backgrounds rather than the trades themselves.",
    watchFor:
      "The constraint in home services is almost always labor: finding, training, and keeping good technicians. Seasonality matters in some niches (lawn care, restoration). And because the footprint is light, differentiation comes from operations and service quality, not location. Read Item 19 carefully and talk to franchisees about their hiring reality.",
    checklistSlug: "home-services",
    faqs: [
      {
        q: "Are home services franchises a good fit for someone with no trade experience?",
        a: "Often, yes. Many home services owners have never done the hands-on work themselves. The franchise model supplies the training and systems; the owner's job is usually hiring technicians, local marketing, and running the operation. Brands will tell you what background they look for during validation.",
      },
      {
        q: "Why are home services franchises considered lower overhead?",
        a: "Most are van-based or use a small warehouse rather than a customer-facing retail space, so you avoid the expensive build-outs and prime-location rent that food and fitness concepts require. That lowers the total investment and the fixed monthly cost, though you still need working capital and marketing spend.",
      },
      {
        q: "What is the biggest challenge in a home services franchise?",
        a: "Labor. The model lives or dies on your ability to recruit, train, and retain reliable field technicians. When you do validation calls with existing franchisees, ask specifically how they staff up and what their turnover looks like.",
      },
    ],
    relatedArticles: [
      { slug: "home-services-franchises-most-overlooked-category", title: "Home services: the most overlooked category" },
      { slug: "maid-and-residential-cleaning-franchises", title: "Maid and residential cleaning franchises" },
      { slug: "junk-removal-franchise-economics-explained", title: "Junk removal franchise economics" },
      { slug: "mosquito-control-franchises", title: "Mosquito control franchises" },
      { slug: "garage-transformation-franchises", title: "Garage transformation franchises" },
    ],
  },
  {
    slug: "senior-care",
    name: "Senior Care",
    navLabel: "Senior Care",
    metaTitle: "Senior Care Franchises: Is the Category Right for You?",
    metaDescription:
      "What senior care franchises actually involve: non-medical home care vs. other models, who the category fits, and the emotional and staffing realities.",
    heroTagline: "Backed by a clear demographic tailwind and mission-driven, with real caregiving and compliance demands.",
    intro:
      "Senior care sits on one of the clearest demographic tailwinds in business: an aging population that increasingly wants to stay at home. Most franchises in this space provide non-medical in-home care (companionship, help with daily living, transportation), though some operate in placement, home health, or facilities.",
    whatItIs:
      "A non-medical home care franchise is essentially a staffing and care-coordination business. You recruit and schedule caregivers, build referral relationships with hospitals, discharge planners, and senior communities, and manage care plans for clients. It is people-intensive on both sides: caregivers and clients.",
    whoItFits:
      "It tends to fit owners who are genuinely motivated by the mission and comfortable in a relationship-driven, sometimes emotionally heavy business. Strong operators here are good at recruiting caregivers, building professional referral networks, and handling the human side when things go wrong.",
    watchFor:
      "Caregiver recruiting and retention is the central challenge, much like home services. There can be licensing and compliance requirements that vary by state. And the work is emotionally real. Clients age, decline, and pass away. This is not a hands-off, semi-absentee category for most people, despite how it is sometimes marketed.",
    checklistSlug: "senior-care",
    faqs: [
      {
        q: "Do I need a medical or healthcare background to own a senior care franchise?",
        a: "For non-medical home care, usually not. These businesses provide companionship and help with daily activities, and the owner's role is recruiting caregivers, building referral relationships, and managing operations. Medical home health models are a different, more regulated category. Confirm which model a brand operates before assuming.",
      },
      {
        q: "Why is senior care considered a growth category?",
        a: "The population aged 65 and older is growing steadily, and most seniors prefer to age in their own homes. That creates durable, demographically driven demand. It does not guarantee any individual outcome, but the underlying need is not a fad.",
      },
      {
        q: "Is senior care a semi-absentee business?",
        a: "Rarely, despite how it is sometimes pitched. It is relationship- and staffing-intensive, with emotional and compliance demands that usually need an engaged owner. Ask franchisees how much time they personally spend in the business each week.",
      },
    ],
    relatedArticles: [
      { slug: "senior-care-franchise-is-it-right-for-you", title: "Senior care franchise: is it right for you?" },
    ],
  },
  {
    slug: "fitness-wellness",
    name: "Fitness & Wellness",
    navLabel: "Fitness & Wellness",
    metaTitle: "Fitness & Wellness Franchises: Durable Business vs. Fad",
    metaDescription:
      "How to tell a durable fitness or wellness franchise from a passing fad: membership economics, build-out costs, who the category fits, and what to scrutinize.",
    heroTagline: "Membership-driven and brand-forward, with real estate, build-out, and trend risk to weigh.",
    intro:
      "Fitness and wellness is one of the most visible franchise categories: boutique studios, gyms, recovery, med-spa-adjacent concepts. It can be a strong business, but it is also where trend risk is highest. The skill is separating a durable, membership-driven model from a concept riding a fad.",
    whatItIs:
      "Most fitness and wellness franchises are membership or package businesses in leased retail space. Economics hinge on member acquisition, retention, and the cost of the build-out and rent. Unlike van-based service models, location and the physical experience matter, which means more capital up front and more dependence on the lease.",
    whoItFits:
      "It tends to suit owners who are energized by community and brand, comfortable with retail-style operations and membership marketing, and able to fund a larger build-out. Passion for the category helps, but the numbers (member retention and unit economics) are what determine whether it works.",
    watchFor:
      "Watch trend durability, build-out cost, and lease terms. A concept that is hot today can cool fast. Scrutinize Item 19 and validation calls for real retention and membership numbers, not just opening-month excitement, and understand the full capital required before signing a multi-year lease.",
    checklistSlug: "fitness-wellness",
    faqs: [
      {
        q: "How do I tell a durable fitness franchise from a fad?",
        a: "Look at whether the model is built on recurring membership and retention rather than novelty, how long the brand has sustained unit-level performance, and what franchisee validation says about member retention over time. A concept that depends on being trendy is riskier than one solving a steady need.",
      },
      {
        q: "Why do fitness franchises usually cost more to open?",
        a: "Most require leased retail space and a significant build-out: equipment, flooring, locker rooms, branding. That raises the total investment and ties you to a multi-year lease, unlike lower-overhead service categories. Item 7 of the FDD lays out the expected total investment.",
      },
      {
        q: "Can a fitness franchise be run semi-absentee?",
        a: "Some brands market themselves that way, but membership businesses still need engaged management of staff, sales, and retention. Treat semi-absentee claims as a question to validate with current franchisees, not a given.",
      },
    ],
    relatedArticles: [
      { slug: "fitness-franchise-comparison-what-the-numbers-say", title: "Fitness franchises: what the numbers say" },
      { slug: "health-wellness-franchises-fad-vs-durable-business", title: "Health & wellness: fad vs. durable business" },
      { slug: "pilates-franchises", title: "Pilates franchises" },
      { slug: "weight-loss-franchises", title: "Weight loss franchises" },
    ],
  },
  {
    slug: "food-and-beverage",
    name: "Food & Beverage",
    navLabel: "Food & Beverage",
    metaTitle: "Food & Beverage Franchises: What the Category Actually Demands",
    metaDescription:
      "The real demands of a food and beverage franchise (capital, labor, hours, and operational intensity), plus who it fits and what to examine before committing.",
    heroTagline: "High brand recognition and customer volume, paired with the highest operational intensity.",
    intro:
      "Food and beverage is the category most people picture when they hear the word franchise. The brands are household names and the category is enormous. It is also, candidly, the most operationally demanding category: long hours, thin margins, heavy labor, and significant capital.",
    whatItIs:
      "A food and beverage franchise is a real-estate, equipment, and labor business. You are managing a physical location, food cost, health and safety compliance, and a sizable hourly staff, often across long daily hours. Build-out and equipment costs are typically the highest of any category, and the lease is central to the deal.",
    whoItFits:
      "It tends to fit owners who genuinely want to run hands-on operations, have or can hire strong restaurant management, and can fund a larger investment. Multi-unit operators with a systems mindset often do best. It is usually a poor fit for someone seeking a light-touch or semi-absentee role.",
    watchFor:
      "Examine total investment and working-capital requirements closely. Food and beverage has the least margin for under-capitalization. Labor cost and availability, food cost volatility, and lease terms all matter. Spend real time on validation calls understanding the daily reality before committing.",
    checklistSlug: "food-and-beverage",
    faqs: [
      {
        q: "Is a food franchise a good first business for a corporate professional?",
        a: "It can be, but it is the most operationally demanding category: long hours, heavy labor, and the highest capital requirements. Some career-changers thrive in it; others find a lower-overhead service category fits their life better. The honest answer depends on your appetite for hands-on operations.",
      },
      {
        q: "Why do food and beverage franchises require so much capital?",
        a: "They are real-estate and equipment businesses. Build-out, kitchen equipment, signage, and initial inventory add up, and you need substantial working capital to carry the location until it matures. Item 7 of the FDD spells out the expected total investment range.",
      },
      {
        q: "Can a food franchise be run semi-absentee?",
        a: "Generally not well, especially as a first unit. The operational intensity usually requires an engaged owner or a strong, well-paid general manager. If a brand pitches semi-absentee food, validate it hard with existing franchisees.",
      },
    ],
    relatedArticles: [
      { slug: "food-and-beverage-franchise-what-it-actually-demands", title: "Food & beverage: what it actually demands" },
    ],
  },
  {
    slug: "b2b-services",
    name: "B2B Services",
    navLabel: "B2B Services",
    metaTitle: "B2B Service Franchises: Why Corporate Professionals Consider Them",
    metaDescription:
      "Why B2B service franchises appeal to corporate professionals: business-hours operations, recurring contracts, lower overhead, and what to scrutinize first.",
    heroTagline: "Business-hours operations and recurring contracts, often a natural fit for corporate backgrounds.",
    intro:
      "B2B service franchises (commercial cleaning, IT and managed services, signage, staffing, business coaching, and the like) are frequently the most natural fit for corporate professionals. The work happens during business hours, the customers are other businesses, and revenue often comes from recurring contracts rather than one-off transactions.",
    whatItIs:
      "Most B2B franchises are relationship- and contract-driven rather than location-dependent. You are selling to and serving businesses, often building a book of recurring accounts. Overhead is typically lower than retail categories, and the owner's role leans toward sales, account management, and team leadership.",
    whoItFits:
      "It tends to fit people coming from corporate, sales, or management backgrounds who are comfortable selling to other professionals and building long-term client relationships. The business-hours rhythm and recurring-revenue structure appeal to those leaving a 9-to-5 who do not want nights-and-weekends operations.",
    watchFor:
      "Sales is the engine. If you dislike business development, scrutinize how much of it the model requires. Recurring contracts are valuable but take time to build, so working capital during ramp matters. As always, validate Item 19 and talk to franchisees about how long it took to fill their pipeline.",
    checklistSlug: "b2b",
    faqs: [
      {
        q: "Why do B2B franchises appeal to former corporate professionals?",
        a: "They tend to run on business hours, sell to other businesses, and generate recurring contract revenue, a rhythm that feels familiar to people leaving a corporate role. The owner's skills (sales, account management, leading a team) often transfer directly.",
      },
      {
        q: "Are B2B service franchises lower risk?",
        a: "They often carry lower overhead than retail or food and benefit from recurring contracts, which can make cash flow steadier once established. That said, no franchise is risk-free; results depend on your market, your sales effort, and the brand. Review Item 19 and validate with franchisees.",
      },
      {
        q: "Do I need to be good at sales to own a B2B franchise?",
        a: "Usually, yes, directly or by hiring for it. Most B2B models grow by winning and keeping business accounts, so business development is central. If selling is not your strength, ask brands how they support lead generation and whether owners typically hire a salesperson.",
      },
    ],
    relatedArticles: [
      { slug: "b2b-franchise-opportunities-lower-risk-steadier-cash", title: "B2B opportunities: lower overhead, recurring revenue" },
      { slug: "it-services-and-msp-franchises", title: "IT services and MSP franchises" },
      { slug: "staffing-franchises", title: "Staffing franchises" },
      { slug: "property-management-franchises", title: "Property management franchises" },
    ],
  },
  {
    slug: "restoration",
    name: "Restoration",
    navLabel: "Restoration",
    metaTitle: "Restoration Franchises: The Disaster-Recovery Business",
    metaDescription:
      "What restoration franchises (water, fire, mold, storm damage) actually involve: insurance-driven demand, 24/7 response, and who the category really fits.",
    heroTagline: "Non-discretionary, insurance-funded demand, with on-call response and certification demands.",
    intro:
      "Restoration covers the cleanup and rebuild work after water, fire, mold, and storm damage. It is one of the more recession-resistant categories because the demand is non-discretionary: when a basement floods or a kitchen burns, the work has to happen, and an insurer usually foots much of the bill. That insulation from consumer spending is the category's defining trait.",
    whatItIs:
      "A restoration franchise is a project- and crew-based business built on rapid emergency response and relationships with insurers, adjusters, and property managers. You dispatch certified technicians, document damage for claims, and manage mitigation and rebuild jobs. Much of the footprint is a warehouse plus equipment and vehicles rather than retail space.",
    whoItFits:
      "It tends to fit owners comfortable with 24/7 on-call operations, project management, and building business-to-business referral relationships (insurance agents, plumbers, property managers). A systems-and-logistics mindset and the stomach for emergency work matter more than any specific trade background.",
    watchFor:
      "Demand is event-driven and can be lumpy, so working capital and crew scheduling matter. Insurance billing cycles can be slow, which strains cash flow. Certifications and compliance are real. As always, scrutinize Item 19 and ask franchisees how they win and keep insurance and adjuster relationships.",
    faqs: [
      {
        q: "Why are restoration franchises considered recession-resistant?",
        a: "The demand is non-discretionary and often insurance-funded. When property is damaged by water, fire, or storms, the cleanup has to happen regardless of the economy, and an insurer usually pays much of the cost. That insulates the category from consumer-spending swings, though it does not guarantee any individual result.",
      },
      {
        q: "Do I need restoration or construction experience to own one?",
        a: "Usually not directly. The franchise supplies certification training and systems; the owner's role is response logistics, crew management, and building referral relationships with insurers and property managers. Brands will tell you the background they look for during validation.",
      },
      {
        q: "What is the hardest part of a restoration business?",
        a: "The combination of 24/7 emergency response, lumpy event-driven demand, and slow insurance billing cycles. You need working capital to carry jobs and a crew you can mobilize quickly. Ask current franchisees how they manage cash flow between large claims.",
      },
    ],
    relatedArticles: [
      { slug: "restoration-franchises-the-disaster-proof-business", title: "Restoration: the disaster-proof business" },
    ],
  },
  {
    slug: "pet-care",
    name: "Pet Care",
    navLabel: "Pet Care",
    metaTitle: "Pet Care Franchises: Built on Steady, Repeat Demand",
    metaDescription:
      "What pet care franchises (grooming, boarding, daycare, walking) actually involve: repeat demand, who the category fits, and what to examine before you commit.",
    heroTagline: "Repeat, relationship-driven demand from devoted owners, with staffing and facility realities.",
    intro:
      "Pet care spans grooming, boarding, daycare, walking, training, and supplies. Owners treat pets like family and tend to keep spending on them through downturns, which gives the category steady, repeat demand. The work is service- and relationship-heavy, and trust is the currency: people are handing you a family member.",
    whatItIs:
      "Most pet care franchises are service businesses, some with a facility (daycare, boarding, grooming salon) and some mobile or light-footprint (walking, mobile grooming). You are managing staff, scheduling, and the customer relationship. Facility-based concepts carry more build-out; mobile and service concepts carry less.",
    whoItFits:
      "It tends to fit owners who genuinely like animals and people, are comfortable managing hourly staff, and can build the trust that turns a one-time client into a recurring one. Passion helps, but the operations (scheduling, staffing, retention) are what determine results.",
    watchFor:
      "Staffing and trust are the constraints: turnover and a single bad incident both hurt. Facility concepts add lease and build-out risk; check capacity and utilization economics. Review Item 19 and talk to franchisees about how they staff, retain clients, and handle the occasional incident.",
    faqs: [
      {
        q: "Why is pet care considered a steady category?",
        a: "Pet owners tend to treat pets as family and keep spending on grooming, boarding, and daycare even in downturns, which produces repeat, relationship-driven demand. That steadiness is a category trait, not a guarantee of any individual outcome.",
      },
      {
        q: "Do pet care franchises require a facility?",
        a: "It depends on the concept. Boarding, daycare, and salon grooming are facility-based with more build-out and lease commitment; dog walking and mobile grooming are light-footprint or mobile with lower overhead. Item 7 of the FDD shows the expected total investment for a given brand.",
      },
      {
        q: "Do I need pet industry experience to own one?",
        a: "Usually not. The franchise provides training and systems; the owner's role is staffing, scheduling, and client relationships. A genuine comfort with animals and the people who love them helps more than formal experience.",
      },
    ],
    relatedArticles: [
      { slug: "pet-care-franchise-built-on-unconditional-demand", title: "Pet care: built on unconditional demand" },
    ],
  },
  {
    slug: "express-car-wash",
    name: "Express Car Wash",
    navLabel: "Express Car Wash",
    metaTitle: "Express Car Wash Franchises: Capital-Heavy, Membership-Driven",
    metaDescription:
      "What express car wash franchises actually involve: high capital and real estate, membership-driven revenue, who the category fits, and what to scrutinize.",
    heroTagline: "Recurring membership revenue and low labor, paired with high capital and real-estate dependence.",
    intro:
      "Express car wash (the conveyor, drive-through model with unlimited-wash memberships) has drawn heavy interest because of its recurring-membership revenue and low headcount per site. It is also among the most capital- and real-estate-intensive categories in franchising: you are building or buying a physical site with expensive equipment.",
    whatItIs:
      "An express car wash is a real-estate and equipment business with a membership engine. Revenue leans on selling and retaining unlimited-wash memberships, while day-to-day labor is comparatively light. Site selection, traffic counts, and the lease or land purchase are central to whether the unit works.",
    whoItFits:
      "It tends to fit owners who can fund or finance a large capital project, think like a real-estate operator, and focus on membership marketing and retention rather than hands-on daily labor. Multi-unit ambitions are common in this category.",
    watchFor:
      "The capital and real-estate requirements are the headline risk. Site selection and the land/lease deal can make or break the economics. Membership churn and local competition matter. Scrutinize Item 7 (total investment) and Item 19 closely, and validate site-level membership numbers with existing operators.",
    faqs: [
      {
        q: "Why do express car wash franchises require so much capital?",
        a: "They are real-estate and equipment businesses. You are building or acquiring a site with conveyor systems and water-reclamation equipment. That makes the total investment among the highest in franchising. Item 7 of the FDD lays out the expected range for a given brand.",
      },
      {
        q: "What makes the express car wash model attractive?",
        a: "Recurring revenue from unlimited-wash memberships and comparatively low labor per site. Those are real structural features, but they depend on site selection, traffic, and membership retention, none of which are guaranteed. Validate the numbers with current operators.",
      },
      {
        q: "Can an express car wash be run semi-absentee?",
        a: "The low daily labor makes it more plausible than food or fitness, and many operators run multiple sites with managers. Still, membership marketing, retention, and site oversight need engaged ownership. Treat any semi-absentee claim as something to validate with franchisees.",
      },
    ],
    relatedArticles: [
      { slug: "should-you-buy-a-car-wash-franchise", title: "Should you buy a car wash franchise?" },
    ],
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug);
}

// Cost-by-category content for the /industries/[slug]/cost pages. Ranges are
// broad, educational, and hedged: general category positioning, never a quote or
// an earnings claim. The authoritative figure for any brand is Item 7 of its FDD.
export type IndustryCost = {
  band: string;        // qualitative position within the overall franchise range
  drivers: string;     // what drives cost up or down in this category
  components: string;  // the main cost components as they apply here
  faqs: IndustryFaq[];
};

export const industryCosts: Record<string, IndustryCost> = {
  "home-services": {
    band: "Home services sits toward the lower end of the franchise cost spectrum: many concepts have total investments in roughly the $75,000–$200,000 range, though it varies by brand. The exact figure for any specific brand is in Item 7 of its FDD.",
    drivers: "Costs stay relatively low because most home services franchises are van-based or run from a small warehouse rather than a customer-facing retail space, so you avoid expensive build-outs and prime-location rent. What you do fund is vehicles, equipment, initial marketing, and working capital to carry payroll until the schedule fills.",
    components: "Expect an initial franchise fee, vehicle and equipment costs, initial marketing spend, licensing or insurance, and working capital. There is little or no retail build-out, which is the single biggest reason this category costs less than food or fitness.",
    faqs: [
      {
        q: "How much does a home services franchise cost?",
        a: "Total investments commonly fall in roughly the $75,000–$200,000 range, lower than retail-heavy categories because most home services concepts are van-based with no storefront build-out. The figure varies by brand and market. Item 7 of a specific brand's FDD gives its exact estimated range.",
      },
      {
        q: "Why are home services franchises cheaper to start?",
        a: "They avoid the two biggest cost drivers in franchising: an expensive retail build-out and prime-location lease. A van, equipment, marketing, and working capital cost far less than a fitted-out storefront, which is why this category is often reachable with less capital.",
      },
    ],
  },
  "senior-care": {
    band: "Senior care (non-medical home care) tends to sit in the lower-to-middle of the range: often roughly $100,000–$250,000 in total investment, depending on the brand. Confirm any specific figure in Item 7 of the FDD.",
    drivers: "It is a staffing and coordination business rather than a build-out business, so the cost is driven less by real estate and more by initial marketing, office setup, licensing/compliance where required, and the working capital to make payroll for caregivers before client revenue ramps.",
    components: "Expect an initial franchise fee, a modest office setup, licensing and compliance costs (which vary by state), recruiting and initial marketing, and meaningful working capital to bridge the ramp period.",
    faqs: [
      {
        q: "How much does a senior care franchise cost?",
        a: "Non-medical home care franchises commonly require roughly $100,000–$250,000 in total investment, though it varies by brand and state. Much of the cost is working capital to carry caregiver payroll during ramp, not real estate. Item 7 of the FDD has the brand-specific range.",
      },
      {
        q: "Do senior care franchises need a big office?",
        a: "Usually not. Non-medical home care runs from a modest office, since caregivers work in clients' homes. That keeps real-estate cost low; the larger capital need is working capital to make payroll while you build the client base.",
      },
    ],
  },
  "fitness-wellness": {
    band: "Fitness and wellness runs higher because of build-out: total investments are often in roughly the $250,000–$600,000+ range, and some concepts exceed that. Always check Item 7 of the specific brand's FDD.",
    drivers: "Cost is driven by leased retail space, the build-out, and equipment. A studio or gym needs flooring, equipment, locker rooms, and branding, plus the rent on a visible location. That fixed footprint is the reason this category costs more than van-based service models.",
    components: "Expect an initial franchise fee, a significant build-out, equipment, signage, a multi-year lease commitment, pre-opening marketing to build a founding membership, and working capital.",
    faqs: [
      {
        q: "How much does a fitness franchise cost?",
        a: "Boutique fitness and gym concepts commonly require roughly $250,000–$600,000 or more in total investment, driven by the leased space, build-out, and equipment. The range varies widely by brand and size. Item 7 of the FDD gives the brand-specific estimate.",
      },
      {
        q: "Why do fitness franchises cost more than service franchises?",
        a: "They require a fitted-out retail space (equipment, flooring, locker rooms, signage) and a multi-year lease, none of which a van-based service business needs. That build-out and rent is the main reason the total investment is higher.",
      },
    ],
  },
  "food-and-beverage": {
    band: "Food and beverage is typically the most capital-intensive category: total investments often run from roughly $250,000 to $1,000,000 or more depending on format. The brand-specific figure is in Item 7 of its FDD.",
    drivers: "Cost is driven by real estate, kitchen build-out, and equipment. A full-service or fast-casual location needs a fitted kitchen, dining or service area, signage, and substantial working capital, plus a long lease. Smaller or non-traditional formats cost less, but the category sits at the top of the range overall.",
    components: "Expect an initial franchise fee, a major build-out, kitchen equipment, signage, initial inventory, a multi-year lease, and significant working capital. Food and beverage has the least tolerance for under-capitalization.",
    faqs: [
      {
        q: "How much does a food franchise cost?",
        a: "Food and beverage franchises commonly require roughly $250,000 to $1,000,000 or more in total investment, the highest of the major categories, driven by real estate, kitchen build-out, and equipment. Smaller formats cost less. Item 7 of the FDD has the brand-specific range.",
      },
      {
        q: "Why are food franchises so expensive to open?",
        a: "They are real-estate and equipment businesses: a fitted kitchen, dining or service space, signage, inventory, and a long lease all add up, and you need substantial working capital to carry the location until it matures. That combination puts the category at the top of the cost range.",
      },
    ],
  },
  "b2b-services": {
    band: "B2B service franchises tend to be lower-cost: many fall in roughly the $75,000–$200,000 total-investment range, since they are relationship- and contract-driven rather than location-dependent. Confirm any figure in Item 7 of the FDD.",
    drivers: "Overhead is low because the business is built on selling to and serving other businesses, often without a customer-facing storefront. Cost goes to the franchise fee, initial marketing and sales infrastructure, any equipment the service requires, and working capital during the pipeline-building phase.",
    components: "Expect an initial franchise fee, sales and marketing setup, modest office or equipment costs depending on the concept, and working capital to fund the ramp while you build a book of recurring accounts.",
    faqs: [
      {
        q: "How much does a B2B franchise cost?",
        a: "Many B2B service franchises require roughly $75,000–$200,000 in total investment, on the lower end because they are contract- and relationship-driven rather than retail. The exact figure varies by brand. Item 7 of the FDD has the specifics.",
      },
      {
        q: "Why are B2B franchises lower cost to start?",
        a: "Most do not need a customer-facing storefront or heavy build-out. The investment goes to the franchise fee, sales and marketing infrastructure, and working capital, far less than a retail or food concept requires.",
      },
    ],
  },
  "restoration": {
    band: "Restoration franchises tend to sit in the middle of the range: often roughly $150,000–$350,000 in total investment, depending on the brand and the equipment package. Check Item 7 of the specific FDD.",
    drivers: "Cost is driven by specialized equipment (drying, extraction, cleaning) and a warehouse to store it and stage crews, plus vehicles. There is no retail storefront, but the equipment package and working capital to carry jobs through slow insurance billing cycles are meaningful.",
    components: "Expect an initial franchise fee, an equipment package, vehicles, a warehouse lease, certifications, initial marketing to build insurer and adjuster relationships, and substantial working capital for billing cycles.",
    faqs: [
      {
        q: "How much does a restoration franchise cost?",
        a: "Restoration franchises commonly require roughly $150,000–$350,000 in total investment, driven by the equipment package, vehicles, and warehouse rather than a storefront. It varies by brand. Item 7 of the FDD gives the exact estimated range.",
      },
      {
        q: "What drives the cost of a restoration franchise?",
        a: "Specialized equipment (extraction, drying, cleaning), vehicles, and a warehouse to store and stage them, plus working capital to carry jobs through slow insurance billing. There is no retail build-out, but the equipment and cash-flow needs are real.",
      },
    ],
  },
  "pet-care": {
    band: "Pet care spans a wide cost range depending on format: mobile or light-footprint concepts can start in roughly the $75,000–$200,000 range, while facility-based daycare, boarding, or grooming concepts often run $300,000–$700,000 or more. Item 7 of the FDD has the brand-specific figure.",
    drivers: "The biggest variable is whether the concept needs a facility. Mobile grooming and dog walking are light on capital; daycare, boarding, and salon concepts carry build-out, specialized fit-out (kennels, wash stations), and a lease. Equipment and working capital apply in both.",
    components: "Expect an initial franchise fee, plus (for facility concepts) build-out, specialized fit-out, and a lease; for mobile concepts, a vehicle and equipment. Both need initial marketing and working capital.",
    faqs: [
      {
        q: "How much does a pet care franchise cost?",
        a: "It depends heavily on format. Mobile or light-footprint pet care can start in roughly the $75,000–$200,000 range, while facility-based daycare, boarding, or grooming concepts often run $300,000–$700,000 or more. Item 7 of the FDD gives the brand-specific estimate.",
      },
      {
        q: "Is a mobile pet franchise cheaper than a facility?",
        a: "Generally yes. Mobile grooming or dog-walking concepts avoid the build-out and lease that daycare, boarding, and salon facilities require, so they tend to need substantially less capital to start.",
      },
    ],
  },
  "express-car-wash": {
    band: "Express car wash is among the most capital-intensive categories because it is a real-estate and equipment project: total investments often run from roughly $1,000,000 to $7,000,000 or more per site, depending on land, construction, and equipment. Item 7 of the FDD has the brand-specific range.",
    drivers: "Cost is dominated by the site: acquiring or leasing land, constructing the wash tunnel, and installing conveyor and water-reclamation equipment. Labor per site is low, but the upfront capital project is large, which is why many operators finance heavily or build multiple sites.",
    components: "Expect land acquisition or a long ground lease, construction, conveyor and reclamation equipment, signage, an initial franchise fee, and working capital. The real-estate and construction line items dwarf the others.",
    faqs: [
      {
        q: "How much does an express car wash franchise cost?",
        a: "Express car wash is one of the most capital-intensive franchise categories: total investments often run from roughly $1,000,000 to $7,000,000 or more per site, driven by land, construction, and equipment. The brand-specific range is in Item 7 of its FDD.",
      },
      {
        q: "Why are car wash franchises so capital-intensive?",
        a: "They are real-estate and construction projects: you acquire or lease land, build the wash tunnel, and install conveyor and water-reclamation equipment before opening. Those upfront costs are far larger than the labor or fee components, which is why heavy financing is common.",
      },
    ],
  },
};

export function getIndustryCost(slug: string): IndustryCost | undefined {
  return industryCosts[slug];
}
