import type { Metadata } from "next";
import Link from "next/link";

const glossarySchema = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Franchise Glossary | Waypoint Franchise Advisors",
  description:
    "Plain-language definitions of franchise industry terms for prospective franchise buyers, including FDD items, royalty, territory, discovery day, ROBS, unit economics, semi-absentee, SBA loans, and more.",
  url: "https://waypointfranchise.com/glossary",
  publisher: {
    "@type": "Organization",
    "@id": "https://waypointfranchise.com/#business",
    name: "Waypoint Franchise Advisors",
  },
};

export const metadata: Metadata = {
  title: "Franchise Glossary: 90+ Key Terms Explained | Waypoint Franchise Advisors",
  description:
    "The most complete plain-language franchise glossary for buyers: FDD items 5–21, royalty, territory, Item 19, discovery day, ROBS, SBA loans, unit economics, semi-absentee, non-compete, transfer fee, and more.",
  alternates: { canonical: "https://waypointfranchise.com/glossary" },
  openGraph: {
    title: "Franchise Glossary | Waypoint Franchise Advisors",
    description:
      "Every term a franchise buyer needs to understand, explained in plain language. 60+ definitions from FDD to unit economics.",
    url: "https://waypointfranchise.com/glossary",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Franchise Glossary" }],
  },
};

const terms = [
  {
    letter: "A",
    entries: [
      {
        term: "Absentee Ownership",
        definition:
          "A franchise ownership model where the franchisee is a pure investor with no day-to-day involvement in operations. True absentee ownership is rare in franchising. Most models marketed as absentee still require an engaged owner who reviews financials, makes hiring decisions, and handles strategic problems. When a franchise brand claims absentee-friendliness, the right question is whether Item 19 of the FDD supports the revenue needed to carry a full management layer without owner oversight.",
        related: "/resources/the-semi-absentee-franchise-real-talk",
        relatedLabel: "The semi-absentee franchise: real talk",
      },
      {
        term: "Approved Supplier",
        definition:
          "A vendor vetted and authorized by the franchisor as a source for products, ingredients, equipment, or services used in your franchise. Sometimes called a designated supplier. Most franchise agreements require you to purchase certain items exclusively from approved sources to maintain quality and brand consistency. This can work in your favor since franchisors often negotiate volume discounts you could not get alone, but it can also mean paying above-market prices if the franchisor marks up supplier costs. Review Item 8 of the FDD for full supplier details.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Arbitration Clause",
        definition:
          "A provision in your franchise agreement requiring that disputes be resolved through private arbitration rather than a courtroom lawsuit. Most franchise agreements include one, typically specifying that arbitration takes place in the franchisor's home city under rules set by the American Arbitration Association. Arbitration decisions are binding and very difficult to appeal, you may have to travel across the country to participate, and many clauses also waive your right to join a class action. Review this clause carefully with a franchise attorney before signing.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and cannot negotiate",
      },
      {
        term: "Area Development Agreement",
        definition:
          "A contract that gives a franchisee the right and the obligation to open a specified number of units within a defined region over an agreed timeline. Unlike a single-unit franchise agreement, an area development agreement commits you to a development schedule. Missing milestones can put the entire agreement at risk. The upside: locking in territory before competitors can claim it, often at a lower per-unit fee than buying units one at a time.",
        related: "/resources/one-unit-or-multi-unit-what-first-timers-get-wrong",
        relatedLabel: "One unit or multi-unit: what first-timers get wrong",
      },
      {
        term: "Asset-Light Franchise",
        definition:
          "A franchise model requiring minimal physical infrastructure: no storefront, no expensive equipment, no inventory. Home-based, mobile, and van-based service businesses are typically asset-light. Lower startup costs and faster break-even timelines are the upside. The trade-off is that asset-light businesses often face lower barriers to competition and may have less defensible territory. Examples include window cleaning, pet waste removal, and business coaching franchises.",
        related: "/resources/asset-light-vs-capital-heavy-choosing-your-franchise-type",
        relatedLabel: "Asset-light vs. capital-heavy: choosing your type",
      },
      {
        term: "Average Unit Volume (AUV)",
        definition:
          "The average annual revenue generated by a single franchise location, calculated by dividing total system-wide sales by the number of open units. AUV is often disclosed in Item 19 of the FDD and is one of the most widely used benchmarks for comparing franchise opportunities. The critical caveat: AUV measures gross sales, not profit. A franchise with a $1.2 million AUV and 15% operating margins generates very different take-home income than one with the same AUV and 8% margins. Always read the footnotes in Item 19 to understand what is included and excluded.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
    ],
  },
  {
    letter: "B",
    entries: [
      {
        term: "B2B Franchise",
        definition:
          "A franchise where the primary customers are businesses rather than individual consumers. Examples include commercial cleaning, cost-reduction consulting, staffing, IT managed services, and signage. B2B franchises typically have longer sales cycles, higher average transaction values, and stronger contract-based recurring revenue than B2C models. They also have less foot-traffic dependency. Location matters less than the owner's ability to prospect and manage commercial relationships.",
        related: "/resources/b2b-franchise-opportunities-lower-risk-steadier-cash",
        relatedLabel: "B2B franchise opportunities: lower risk, steadier cash",
      },
      {
        term: "Brand Standards",
        definition:
          "The specific rules set by the franchisor governing every aspect of how you operate: store appearance, signage, uniforms, customer service scripts, food preparation procedures, and technology systems. Brand standards are detailed in the Operations Manual and enforced through regular field visits and compliance audits. Failure to meet brand standards is one of the most common causes of franchisee default. Before signing, understand the level of day-to-day control the franchisor exercises and confirm you are comfortable with it.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and cannot negotiate",
      },
      {
        term: "Break-Even Point",
        definition:
          "The moment when your franchise's total revenue equals its total costs, including both the initial investment and ongoing operating expenses. Before break-even, you are spending more than you are earning and relying on working capital reserves to stay afloat. Time to break even varies widely: low-cost service franchises may hit it in 3 to 6 months, while restaurant build-outs can take 18 to 24 months or longer. During validation calls, ask existing franchisees how long it took them to break even. This is often more telling than any projection in Item 19.",
        related: "/resources/what-is-your-time-worth-the-roi-math-of-franchise-ownership",
        relatedLabel: "The ROI math of franchise ownership",
      },
      {
        term: "Brick-and-Mortar Franchise",
        definition:
          "A franchise that operates from a fixed physical location: a storefront, studio, restaurant, or clinic. Brick-and-mortar franchises carry higher build-out costs, longer ramp-up timelines, and more complex real estate negotiations than home-based or mobile models. They benefit from walk-in traffic, brand visibility, and stronger customer loyalty from regular in-person visits. Fitness studios, med spas, and QSR brands are typical examples.",
        related: "/resources/asset-light-vs-capital-heavy-choosing-your-franchise-type",
        relatedLabel: "Asset-light vs. capital-heavy: choosing your type",
      },
      {
        term: "Build-Out",
        definition:
          "The construction, renovation, and fit-out work required to prepare a physical location for franchise operations, including installing equipment, signage, fixtures, and brand-required design elements. Build-out costs are one of the largest line items in FDD Item 7 for brick-and-mortar concepts and vary significantly depending on whether the space is raw or already partially improved. Most franchisors have approved vendor relationships and design standards that dictate what the build-out must include.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Business Format Franchising",
        definition:
          "The model behind the vast majority of franchise opportunities. The franchisor licenses you not just a brand name and products but an entire system for running the business, including standardized operations, training programs, marketing strategies, technology platforms, and ongoing support. This is distinct from product distribution franchising (like auto dealerships or gas stations), where you sell a manufacturer's products but largely run the business your own way. Business format franchising offers more structure and support, but also more franchisor control.",
        related: "/resources/do-you-need-a-franchise-consultant",
        relatedLabel: "Do you need a franchise consultant?",
      },
    ],
  },
  {
    letter: "C",
    entries: [
      {
        term: "C-Corporation",
        definition:
          "A standard corporate structure that is a separate legal entity from its owners. In franchising, a C-Corp is a required component of a ROBS (Rollover for Business Startups) structure. The retirement plan invests in the C-Corp, which uses the funds to purchase the franchise. Beyond ROBS, some franchisors require or prefer franchisees to form a C-Corp or LLC for liability and operational reasons. A franchise attorney or business attorney should advise on entity structure before signing any agreement.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Churning",
        definition:
          "When a franchisor repeatedly resells a failing franchise location to new buyers, even though the location has a pattern of failure regardless of who owns it. A single territory might be churned through several owners, each paying a fresh franchise fee. You can spot potential churning by studying Item 20 of the FDD, which discloses unit openings, closings, transfers, and terminations over the past three years. If you see the same territory changing hands multiple times, proceed with extreme caution.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Co-Branding",
        definition:
          "Operating two or more franchise brands within a single physical location, like a combined Taco Bell and KFC, or a Dunkin' inside a gas station. The logic: complementary brands share rent, utilities, and some labor costs while attracting a wider range of customers. Co-branded locations can improve unit economics, but they require managing multiple franchise agreements, brand standards, and supply chains simultaneously. Not all franchise systems permit co-branding, so confirm whether it is an option before assuming it as a growth strategy.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Company-Owned Location",
        definition:
          "A franchise unit owned and operated directly by the franchisor's corporate entity rather than by an independent franchisee. The ratio of company-owned to franchised locations tells you something important: a franchisor with significant company-owned stores has direct skin in the game and operational credibility. Conversely, a system rapidly selling off its company-owned locations may signal financial distress or a shift in strategy. Check Items 1 and 20 of the FDD for this data.",
        related: "/resources/how-to-tell-if-a-franchisor-actually-cares",
        relatedLabel: "How to tell if a franchisor actually cares",
      },
      {
        term: "Conversion Franchise",
        definition:
          "A model where an existing independent business converts to a franchise brand by adopting its systems, branding, and support infrastructure in exchange for fees and royalties. Common in home services, real estate, and cleaning. Conversion franchises allow the franchisor to grow quickly with owners who already have operational experience; they give independent business owners access to brand recognition and systems they would otherwise build themselves.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Cooling-Off Period",
        definition:
          "The FTC-mandated 14 calendar days during which you must have the FDD in your hands before you can sign a franchise agreement or pay any fees. This legal protection exists to ensure you have adequate time to read the disclosure document, consult with a franchise attorney and accountant, conduct validation calls with existing franchisees, and make an informed decision. If a franchisor pressures you to sign before this period expires, that is a serious red flag and a potential violation of federal law.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and cannot negotiate",
      },
      {
        term: "Cure Period",
        definition:
          "The window of time your franchise agreement gives you to fix a problem after the franchisor notifies you that you have violated the agreement. Typical cure periods range from 10 to 60 days, depending on the severity of the violation. Some breaches, such as fraud or criminal activity, may be classified as incurable, allowing the franchisor to terminate immediately. Several states have franchise relationship laws that mandate minimum cure periods, potentially overriding shorter timeframes written into your contract.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and cannot negotiate",
      },
    ],
  },
  {
    letter: "D",
    entries: [
      {
        term: "Development Schedule",
        definition:
          "The timeline attached to an area development agreement specifying when each unit must be opened. An agreement to open five locations might require the first to open within 12 months, two more within 24 months, and so on. Missing a development schedule milestone is a material breach of most area development agreements and can result in the loss of future territory rights. Franchisors use development schedules to ensure territory is being built out, not just held.",
        related: "/resources/one-unit-or-multi-unit-what-first-timers-get-wrong",
        relatedLabel: "One unit or multi-unit: what first-timers get wrong",
      },
      {
        term: "Discovery Day",
        definition:
          "An invitation-only event where serious franchise candidates visit the franchisor's headquarters to meet the leadership team, tour operations, and ask questions before making a final decision. Discovery Day usually occurs near the end of the evaluation process and is not a sales pitch. It is a mutual assessment. Candidates evaluate the team; the team evaluates whether the candidate is the right fit for the system.",
        related: "/resources/what-to-expect-at-discovery-day",
        relatedLabel: "What to expect at discovery day",
      },
      {
        term: "Disclosure Document",
        definition:
          "See Franchise Disclosure Document (FDD). Federal law requires every franchisor to provide this document to prospective franchisees at least 14 calendar days before any agreement is signed or any money changes hands.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Due Diligence",
        definition:
          "The structured investigation a prospective franchisee conducts before signing any agreement: reading the FDD, calling existing franchisees from Item 20, reviewing Item 19 financial data, confirming territory availability, retaining a franchise attorney, and lining up financing. Thorough due diligence is the primary difference between franchise buyers who go in with realistic expectations and those who discover problems after they have signed. The process typically takes four to eight weeks when done properly.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
    ],
  },
  {
    letter: "E",
    entries: [
      {
        term: "EBITDA",
        definition:
          "Earnings Before Interest, Taxes, Depreciation, and Amortization. In franchising, it is the standard way to measure a location's core operating profitability: what the business earns from day-to-day operations, stripped of financing choices and accounting adjustments. EBITDA is also how franchise resale prices are determined: buyers and brokers typically value a franchise at a multiple of its EBITDA, often 2x to 5x for most systems and higher for premium brands. If you plan to eventually sell your franchise, understanding EBITDA is essential.",
        related: "/resources/what-is-your-time-worth-the-roi-math-of-franchise-ownership",
        relatedLabel: "The ROI math of franchise ownership",
      },
      {
        term: "Encroachment",
        definition:
          "When a franchisor opens a new franchise location, company-owned unit, or online sales channel close enough to your existing location to pull away your customers and reduce your revenue. Even when your franchise agreement includes a protected territory, the protection may be narrower than you think. Many agreements explicitly reserve the franchisor's right to sell through e-commerce, delivery apps, or non-traditional venues within your area. This is one of the most common franchisee complaints across the industry.",
        related: "/resources/how-to-pick-a-franchise-territory",
        relatedLabel: "How to pick a franchise territory",
      },
      {
        term: "Equity Injection",
        definition:
          "The portion of a franchise investment contributed from personal funds rather than borrowed capital. SBA lenders typically require a 10%–20% equity injection of the total project cost. A $400,000 total investment would require $40,000–$80,000 in equity from the borrower. Equity injection demonstrates financial commitment to the lender and reduces the loan amount needed. It can come from liquid savings, a ROBS structure using retirement funds, or a family gift (with proper documentation).",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Executive Model",
        definition:
          "A franchise ownership structure where the franchisee hires and manages an operational team rather than performing the service work themselves. The franchisee acts as the business owner, handling financials, growth strategy, hiring, and culture, while trained employees deliver the service. Executive model franchises differ from semi-absentee in that the owner is often working full-time in the business, just not in a technical or labor capacity. Common in senior care, commercial cleaning, and staffing categories.",
        related: "/resources/the-semi-absentee-franchise-real-talk",
        relatedLabel: "The semi-absentee franchise: real talk",
      },
    ],
  },
  {
    letter: "F",
    entries: [
      {
        term: "FDD Item 5",
        definition:
          "The section of the Franchise Disclosure Document that lists all initial fees paid to the franchisor, primarily the franchise fee. Item 5 also discloses whether fees are uniform across all buyers or whether they vary, and under what conditions. Some brands offer reduced franchise fees for veterans, multi-unit buyers, or early-signing incentives. Those conditions are documented here.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "FDD Item 6",
        definition:
          "The section that lists all ongoing fees paid to the franchisor: royalties, marketing fund contributions, technology fees, training fees, and any other recurring obligations. Item 6 is where the true ongoing cost of brand affiliation becomes visible. A brand with a 6% royalty and a 2% marketing fund costs 8% of gross revenue before any local operating expenses. Reading Item 6 alongside Item 19 tells you whether the business model actually works at those fee levels.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "FDD Item 7",
        definition:
          "The section disclosing the estimated initial investment range, meaning the total capital required to open one franchise unit. Item 7 must include every pre-opening cost: franchise fee, real estate, build-out, equipment, inventory, training travel, working capital, and opening marketing. Ranges are estimates. Actual costs depend on your market, your real estate deal, and your contractor. Treat the low end as optimistic and the high end as your planning number.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "FDD Item 12",
        definition:
          "The section defining your territory rights: what geographic area you control, what protections you have against competing units opening nearby, and any carveouts or exceptions. Item 12 is where vague territory protection language becomes legally binding. Some franchisors offer robust exclusivity; others reserve rights to sell through alternate channels (online, kiosks) even within your territory. Review this section closely with a franchise attorney.",
        related: "/resources/how-to-pick-a-franchise-territory",
        relatedLabel: "How to pick a franchise territory",
      },
      {
        term: "FDD Item 19",
        definition:
          "The optional section where franchisors may disclose financial performance data, including revenue, expenses, and sometimes earnings, for existing units. Item 19 disclosure is not required, but its absence is itself informative. When data exists, it requires careful reading: averages across large systems can mask wide variation between top and bottom performers. The most valuable Item 19s show unit-level cost structures, not just top-line revenue.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "FDD Item 20",
        definition:
          "The section listing every current franchisee in the system by name, location, and contact information. This is the most underused tool in franchise due diligence. Calling franchisees directly from Item 20 (not just the ones the franchisor refers you to) is one of the most reliable ways to understand what it is actually like to operate that business.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "FDD Item 21",
        definition:
          "The section containing the franchisor's audited financial statements, typically three years of balance sheets and income statements. Item 21 tells you whether the franchisor itself is financially stable. A franchisor with weak financials, declining cash reserves, or significant debt is a system-level risk: if the parent company struggles, support quality suffers and the brand's long-term viability comes into question.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Franchise Advisory Council (FAC)",
        definition:
          "A committee of elected or appointed franchisees who serve as a formal communication channel between the franchise owner community and the franchisor's corporate leadership. FACs typically advise on marketing strategies, operational policies, training programs, and system-wide decisions. A well-functioning FAC is a strong indicator of a healthy franchise culture. During validation calls, ask existing owners whether the FAC has genuine influence over corporate decisions or is merely symbolic.",
        related: "/resources/how-to-tell-if-a-franchisor-actually-cares",
        relatedLabel: "How to tell if a franchisor actually cares",
      },
      {
        term: "Franchise Agreement",
        definition:
          "The legal contract between a franchisor and franchisee governing the operating relationship for the term of the franchise (typically 10 years with renewal options). It covers territory rights, royalty obligations, operating standards, transfer rules, and termination conditions. Unlike the FDD, the franchise agreement is the binding document. What is in it governs, not what was said in conversation.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Franchise Attorney",
        definition:
          "A lawyer who specializes in franchise law and can review your FDD and franchise agreement, identify risky or unusual clauses, negotiate modifications, and represent your interests if disputes arise. This is different from a general business attorney who may not understand franchise-specific regulations, common contract pitfalls, or industry norms. Hiring a franchise attorney who represents franchisees, not one recommended by the franchisor, is one of the highest-ROI investments a first-time buyer can make, typically $2,000 to $5,000 for a thorough review.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and cannot negotiate",
      },
      {
        term: "Franchise Broker",
        definition:
          "An independent professional who connects franchisors with prospective buyers and earns a commission, typically 40 to 50 percent of the franchise fee, paid by the franchisor when a deal closes. Many brokers present themselves as franchise consultants or advisors, but their compensation comes from the franchisor. This means they can only present brands they have commission relationships with and have a financial incentive to close a sale. Brokers can be genuinely helpful in narrowing options, but supplement their recommendations with your own independent research.",
        related: "/resources/do-you-need-a-franchise-consultant",
        relatedLabel: "Do you need a franchise consultant?",
      },
      {
        term: "Franchise Business Review (FBR)",
        definition:
          "The leading independent research firm that surveys actual franchisees about their satisfaction and publishes annual rankings of top franchise brands based on those results. Unlike best-franchise lists that rely on franchisor-submitted data or financial metrics alone, FBR's rankings are built on direct feedback from franchise owners about training quality, corporate support, financial performance, and overall satisfaction. Checking whether a brand you are considering has been FBR-surveyed and how it scored is a valuable due diligence step that complements your own validation calls.",
        related: "/resources/how-to-tell-if-a-franchisor-actually-cares",
        relatedLabel: "How to tell if a franchisor actually cares",
      },
      {
        term: "Franchise Disclosure Document (FDD)",
        definition:
          "A federally mandated document, typically 200–400 pages, that every franchisor must provide to prospective buyers before any agreement or payment. Organized into 23 items, it covers the franchisor's history, leadership, litigation history, fees, investment requirements, territory rights, franchisee obligations, financial performance data (Item 19), and a contact list of all current franchisees (Item 20). Reading the FDD, especially Items 5, 6, 7, 19, and 20, is one of the most important steps in franchise due diligence.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Franchise Fee",
        definition:
          "A one-time upfront payment to the franchisor, typically $20,000 to $60,000, made at the time of signing the franchise agreement. It grants the franchisee the right to operate under the brand's system, intellectual property, and territory. The franchise fee does not cover build-out, equipment, working capital, or ongoing royalties. It is defined in FDD Item 5.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Franchise Registry (SBA)",
        definition:
          "A list maintained by the Small Business Administration identifying franchise brands whose agreements have been pre-reviewed for SBA loan eligibility. When a brand is on the SBA Franchise Registry, the loan approval process is significantly faster because the SBA has already determined the structure is eligible. Brands not on the registry are not ineligible, but the process takes longer. Confirming SBA Registry status is a practical step if you plan to use SBA financing.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Franchisee",
        definition:
          "The independent business owner who purchases the rights to operate a franchise unit under the franchisor's brand and system. A franchisee owns their business, including the assets, the operations, and the employees, but operates within the standards and guidelines set by the franchisor.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Franchisor",
        definition:
          "The company that licenses its brand, systems, and intellectual property to franchisees in exchange for fees and royalties. The franchisor sets operating standards, provides training and support, manages the national brand, and is responsible for the strength of the system overall. Not all franchisors are equal in their support quality.",
        related: "/resources/how-to-tell-if-a-franchisor-actually-cares",
        relatedLabel: "How to tell if a franchisor actually cares",
      },
      {
        term: "FranchiseWire",
        definition:
          "See FranChoice. A franchising news and education platform.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Financial Performance Representation (FPR)",
        definition:
          "Any claim a franchisor makes about the actual or potential revenue, costs, or profits of its franchise units. If a franchisor provides an FPR, it must appear in Item 19 of the FDD. Nowhere else, not even verbally. About 66 percent of franchisors now include some level of FPR data, but the scope varies widely: some report system-wide averages, others show only top-performing locations. If a franchisor does not include an FPR, they are legally prohibited from telling you how much you might earn.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "FTC Franchise Rule",
        definition:
          "The federal regulation that governs franchising in the United States. It requires every franchisor to provide you with a Franchise Disclosure Document at least 14 days before you sign anything or pay any money. The rule defines a franchise as any business relationship involving three elements: use of the franchisor's trademark, significant operational control or assistance, and a required payment of $500 or more. If a franchisor skips any disclosure requirements, they are breaking federal law.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "FranChoice",
        definition:
          "One of the largest franchise consulting and advisory networks in the United States, with hundreds of independent franchise advisors who work with candidates nationwide. FranChoice advisors, including Kelsey Stuart at Waypoint Franchise Advisors, are paid by franchise brands when a candidate they represent becomes a franchisee. The service is free to candidates.",
        related: "/about",
        relatedLabel: "About Kelsey and Waypoint",
      },
    ],
  },
  {
    letter: "G",
    entries: [
      {
        term: "General Manager",
        definition:
          "In a franchise context, the hired professional responsible for day-to-day operations of a franchise unit, typically in a semi-absentee or executive model structure. A qualified general manager allows the owner to step back from daily operations while the business continues to run. The cost of a general manager (salary, benefits, performance incentives) must be accounted for in the financial model. If Item 19 revenue figures do not support that cost, the semi-absentee claim is a marketing label, not an operational reality.",
        related: "/resources/the-semi-absentee-franchise-real-talk",
        relatedLabel: "The semi-absentee franchise: real talk",
      },
      {
        term: "Ghost Kitchen",
        definition:
          "A delivery-only food operation with no dining room, no storefront, and no walk-up service. It is a commercial kitchen optimized for preparing meals sold through delivery apps. Several established franchise brands now offer ghost kitchen models with dramatically lower build-out costs, sometimes one-tenth of a traditional restaurant location. The tradeoff is that you lose walk-in customers entirely and become dependent on third-party delivery platforms and their commission fees. Ghost kitchens represent one of the fastest-growing entry points into food-service franchising.",
        related: "/resources/asset-light-vs-capital-heavy-choosing-your-franchise-type",
        relatedLabel: "Asset-light vs. capital-heavy: choosing your type",
      },
      {
        term: "Grand Opening Fee",
        definition:
          "A one-time fee paid to the franchisor to fund local marketing and promotional activities around a new unit's launch: advertising, direct mail, event support, and brand awareness spending in your market. Grand opening fees are disclosed in FDD Item 6 or Item 7 and typically range from $5,000–$25,000 depending on the brand. Some franchisors provide significant hands-on support during opening; others provide a playbook.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
    ],
  },
  {
    letter: "H",
    entries: [
      {
        term: "HELOC (Home Equity Line of Credit)",
        definition:
          "A revolving credit line borrowed against the equity in your home, sometimes used to fund part of a franchise purchase. HELOCs offer flexible access to capital at lower interest rates than unsecured loans, but they put your home at risk if the business underperforms. When used as an equity injection alongside an SBA loan, a HELOC can be an effective piece of a franchise financing stack, but it requires careful cash flow modeling to ensure both the business and the line can be serviced simultaneously.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Home-Based Franchise",
        definition:
          "A franchise that can be operated from the franchisee's residence without a commercial storefront. Home-based franchises eliminate lease costs and significantly reduce initial investment. They include business coaching, cost-reduction consulting, pet waste removal, senior placement, and many home service sales businesses. The trade-off is the discipline to treat a home office as a professional work environment and, in some categories, the perception challenge of operating without a physical address.",
        related: "/resources/asset-light-vs-capital-heavy-choosing-your-franchise-type",
        relatedLabel: "Asset-light vs. capital-heavy: choosing your type",
      },
    ],
  },
  {
    letter: "I",
    entries: [
      {
        term: "Initial Investment",
        definition:
          "The total estimated cost to open and begin operating a franchise unit, as disclosed in FDD Item 7. It includes the franchise fee, build-out, equipment, initial inventory, working capital, training costs, and pre-opening expenses. Ranges vary widely by category, from under $100,000 for home-based service concepts to $500,000+ for full brick-and-mortar locations.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Item 19",
        definition:
          "See FDD Item 19. The optional financial performance disclosure section of the Franchise Disclosure Document. One of the most critical sections for evaluating franchise investment viability.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Item 20",
        definition:
          "See FDD Item 20. The section listing all current and former franchisees with contact information. This is the foundation of productive validation calls.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
    ],
  },
  {
    letter: "L",
    entries: [
      {
        term: "Liquid Capital",
        definition:
          "Cash or near-cash assets that can be accessed immediately without selling long-term investments or taking on debt, including checking and savings accounts, money market funds, and short-term CDs. When a franchisor states a minimum liquid capital requirement, they are asking how much you can put to work today without liquidating retirement accounts or real estate. Most brands require $50,000–$150,000 in liquid capital depending on the model. This is distinct from net worth, which includes illiquid assets.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Liquid Net Worth",
        definition:
          "The portion of your total net worth that is readily accessible: liquid assets minus short-term liabilities. Lenders and franchisors use liquid net worth to assess whether a buyer has the financial cushion to sustain the business through its ramp-up period. A buyer with a $2M net worth tied entirely to real estate and retirement accounts may have a lower liquid net worth than the brand's minimum requirement.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
    ],
  },
  {
    letter: "M",
    entries: [
      {
        term: "Marketing Fund",
        definition:
          "A mandatory ongoing contribution, typically 1%–3% of gross revenue, paid by franchisees into a shared pool used for national or regional brand advertising. The marketing fund is separate from the royalty. How it is managed and how the spend is reported varies significantly by brand.",
        related: "/investment",
        relatedLabel: "Full cost breakdown",
      },
      {
        term: "Master Franchise",
        definition:
          "An arrangement where a franchisee (the master franchisee) purchases the rights to develop and sub-franchise a brand within a large region, often a state, country, or major metropolitan area. The master franchisee recruits, trains, and supports individual unit franchisees within their region and earns a portion of the fees and royalties those franchisees pay. Master franchise agreements are capital-intensive and operationally complex but represent a significant business-building opportunity.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Mobile Franchise",
        definition:
          "A franchise where the service is delivered via a vehicle (van, truck, or trailer) rather than from a fixed location. Mobile franchises include pet grooming, window cleaning, pressure washing, lawn care, and similar delivered services. They have low real estate costs, can serve large geographic areas, and scale by adding vehicles and technicians as revenue grows. Success depends on scheduling discipline and keeping utilization high across multiple vehicles.",
        related: "/resources/home-services-franchises-most-overlooked-category",
        relatedLabel: "Home services franchises: most overlooked category",
      },
      {
        term: "Multi-Unit Franchise",
        definition:
          "An ownership structure where a franchisee operates two or more units under the same brand, either within a single territory or across multiple territories. Multi-unit agreements sometimes include development schedules and often involve discounted fees. A multi-unit development agreement does not mean writing multiple checks today. It means committing to a build-out timeline where the first unit generates cash flow that helps fund subsequent openings.",
        related: "/resources/one-unit-or-multi-unit-what-first-timers-get-wrong",
        relatedLabel: "One unit or multi-unit: what first-timers get wrong",
      },
    ],
  },
  {
    letter: "N",
    entries: [
      {
        term: "Net Worth Requirement",
        definition:
          "A minimum total asset threshold (assets minus liabilities) that a franchisor requires of prospective franchisees, disclosed in FDD Item 5. A $500,000 net worth requirement does not mean $500,000 in cash. It means the total value of what you own (home equity, retirement accounts, investments, business interests) minus what you owe must reach that threshold. Net worth requirements ensure franchisees have enough financial depth to weather slow periods.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Non-Compete Clause",
        definition:
          "A legal provision in the franchise agreement prohibiting the franchisee from operating a competing business during the term and, in many cases, for a defined period after the agreement ends, typically one to two years within a defined radius. Non-competes are standard in franchise agreements. Their scope and enforceability vary by state. A franchise attorney will flag unusually broad post-term non-competes that could restrict your ability to work in your own industry after the franchise relationship ends.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Non-Disclosure Agreement (NDA)",
        definition:
          "A confidentiality agreement sometimes signed before a franchisor shares detailed proprietary information, such as trade secrets, operations manuals, or supplier pricing, with a prospective franchisee. NDAs in the early stages of franchise exploration are routine. However, franchisors are not permitted to require an NDA before providing the FDD, and any attempt to do so would violate FTC franchise disclosure rules.",
        related: null,
        relatedLabel: null,
      },
    ],
  },
  {
    letter: "O",
    entries: [
      {
        term: "Operations Manual",
        definition:
          "The franchisee's proprietary operating guide, a detailed document often hundreds of pages long, covering every aspect of how the business is run: staffing, customer service, vendor relationships, marketing, compliance, and brand standards. The operations manual is the franchisor's system made tangible. It is typically provided after the franchise agreement is signed, not before. During validation calls, existing franchisees will give you a candid sense of whether the manual is genuinely useful or a binder that sits on a shelf.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Owner-Operator",
        definition:
          "A franchisee who is actively involved in the day-to-day running of their business, either performing the service work themselves or managing staff directly on-site. Owner-operator models have lower initial capital requirements (no management layer to fund from day one) and faster break-even timelines. They suit people who want hands-on experience and a close relationship with their customer base. The trade-off is time: owner-operators are working in the business, not just on it.",
        related: null,
        relatedLabel: null,
      },
    ],
  },
  {
    letter: "P",
    entries: [
      {
        term: "Personal Guarantee",
        definition:
          "A legal commitment in which the franchisee, and often their spouse, pledges personal assets as collateral for a business obligation, most commonly an SBA loan or commercial lease. Personal guarantees are standard in franchising and effectively remove the liability shield of the business entity for the specific obligation guaranteed. Understanding exactly what is personally guaranteed in your franchise deal is an important part of legal review before signing.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Pre-Opening Costs",
        definition:
          "Expenses incurred before the franchise opens for business: training travel and lodging, initial marketing and grand opening spending, pre-opening wages for hired staff, deposits, and professional fees. Pre-opening costs are itemized in FDD Item 7 and should be funded from the initial investment, not from operating cash flow. Underestimating pre-opening costs is one of the most common ways new franchisees arrive at opening day with less runway than they planned.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Pro Forma",
        definition:
          "A set of projected financial statements, typically showing estimated revenue, expenses, and profit, for a franchise location that has not opened yet. Franchisors or lenders may provide pro formas to help you model what your business could look like financially over its first one to three years. Pro formas are educated estimates, not guarantees. They are useful for planning your cash needs and loan applications, but stress-test the assumptions by comparing them against what existing franchisees report during validation calls and against Item 19 data in the FDD.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Protected Territory",
        definition:
          "A geographic area in which the franchisor agrees not to open competing franchise units or sell competing products through other channels. \"Protected\" does not mean unconditionally exclusive in all systems. Franchisors may retain rights to sell through non-traditional venues (airports, stadiums, online) even within a protected territory. The specific protection language is in FDD Item 12. True exclusivity is a contractual promise, not a sales conversation.",
        related: "/resources/how-to-pick-a-franchise-territory",
        relatedLabel: "How to pick a franchise territory",
      },
    ],
  },
  {
    letter: "Q",
    entries: [
      {
        term: "QSR (Quick Service Restaurant)",
        definition:
          "The industry term for fast-food and limited-service restaurants focused on speed, convenience, and affordability. Think McDonald's, Subway, Dunkin', and Taco Bell. QSR is the largest franchise category by unit count and total revenue. If you are considering a food franchise, understanding QSR-specific challenges is essential: high employee turnover, thin profit margins (typically 6 to 9 percent), strict food safety compliance, and the growing importance of drive-thru speed and digital ordering capabilities.",
        related: "/resources/fast-growing-franchise-brand-good-sign-or-red-flag",
        relatedLabel: "Fast-growing franchise brand: good sign or red flag?",
      },
    ],
  },
  {
    letter: "R",
    entries: [
      {
        term: "Ramp-Up Period",
        definition:
          "The initial phase after your franchise opens during which you are building toward full operational capacity and stable revenue. During ramp-up, expect lower-than-average sales, higher-than-normal operating costs, and a steep learning curve for you and your staff. Most franchisors estimate a ramp-up of 3 to 6 months, though some concepts take longer. Your working capital reserve must be large enough to cover this period, because running out of cash during ramp-up is one of the leading causes of early franchise failure.",
        related: "/resources/your-first-90-days-as-a-franchise-owner",
        relatedLabel: "Your first 90 days as a franchise owner",
      },
      {
        term: "Recurring Revenue Model",
        definition:
          "A business structure where customers pay on a scheduled, repeat basis, such as monthly memberships, weekly service routes, or annual contracts, rather than through one-time transactions. Recurring revenue creates predictable cash flow, reduces customer acquisition cost, and improves a business's exit valuation. Pet waste removal, mosquito control, pool maintenance, fitness memberships, and many senior care models operate this way. The ratio of recurring to transactional revenue is one of the most important indicators of franchise stability.",
        related: "/resources/recession-proof-franchise-categories",
        relatedLabel: "Recession-proof franchise categories",
      },
      {
        term: "Registration States",
        definition:
          "The 14 U.S. states, including California, New York, Illinois, Maryland, and Minnesota, that require franchisors to submit their FDD for state regulatory review and approval before offering or selling franchises there. This provides an additional layer of oversight beyond the federal FTC Franchise Rule. State registration does not mean the government endorses the franchise, but it does mean someone has reviewed the documents for completeness. Buyers in non-registration states have fewer regulatory safeguards.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "Renewal Term",
        definition:
          "The option to extend the franchise agreement after the initial term expires, typically for an additional 5 or 10 years. Renewal is not automatic. It usually requires signing the then-current franchise agreement (which may have updated terms), demonstrating good standing, and in some cases paying a renewal fee. Buyers should understand what \"then-current terms\" means: the agreement you renew into may be materially different from the one you originally signed.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Resale (Franchise Resale)",
        definition:
          "The sale of an existing franchise unit from one franchisee to a new owner. A resale differs from buying a new unit. The business has a track record, including revenue history, existing customers, and existing staff, but the purchase price reflects that established value rather than the startup investment in Item 7. Resales require franchisor approval and buyer qualification. They can be an efficient way to acquire a running business, or an expensive way to inherit someone else's problems. Validate the seller's claims with customers, staff, and the brand independently.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Right of First Refusal",
        definition:
          "A contractual right giving the franchisor, or in some cases a current franchisee, the option to purchase a unit before the owner can sell it to a third party. If a franchisee wants to sell, they must first offer the unit to the right-holder under the same terms as the outside buyer. Rights of first refusal are common in franchise agreements and affect exit planning. Understand exactly how yours is structured before signing.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "ROBS (Rollover for Business Startups)",
        definition:
          "A legal financing structure that allows business owners to use 401(k) or other qualified retirement funds to invest in a business without triggering early withdrawal penalties or income taxes. ROBS requires setting up a C-corporation and following strict IRS compliance rules. It is a legitimate and common franchise financing tool when structured properly by a qualified provider.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Royalty",
        definition:
          "An ongoing fee paid by the franchisee to the franchisor, typically 4%\u20138% of gross revenue paid weekly or monthly, in exchange for continued use of the brand, systems, and support infrastructure. Royalties are defined in FDD Item 6 and continue for the full term of the franchise agreement. The royalty rate, combined with the marketing fund contribution, represents the franchisee's total ongoing cost of brand affiliation.",
        related: "/investment",
        relatedLabel: "Full franchise cost breakdown",
      },
    ],
  },
  {
    letter: "S",
    entries: [
      {
        term: "Salon Suite / Booth Rental Model",
        definition:
          "A franchise model in which the franchisee operates as a real estate landlord for independent beauty professionals, including stylists, estheticians, and nail technicians, who rent private suite space within the franchisee's facility. The franchisee does not operate a salon; they operate a building full of individual micro-salons. Revenue comes from suite rental income. Brands like IMAGE Studios, Sola Salons, and MY SALON Suite operate this model. It is a semi-passive, recurring revenue business with a fundamentally different operational profile from a traditional beauty service franchise.",
        related: null,
        relatedLabel: null,
      },
      {
        term: "Same-Store Sales (Comp Sales)",
        definition:
          "A metric comparing revenue at franchise locations that have been open for at least one year, measured year-over-year. Also called comp sales, this strips out the growth effect of new store openings to reveal whether existing locations are growing or shrinking organically. Consistently positive same-store sales growth signals a healthy franchise system with strong consumer demand. Declining comps across a system is a red flag that should prompt deeper investigation during due diligence.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
      {
        term: "SBA Loan (Small Business Administration)",
        definition:
          "A federally backed loan program commonly used to finance franchise purchases. The SBA 7(a) program is the most widely used in franchising, allowing borrowers to finance up to 90% of the total project cost with lower down payments and longer repayment terms than conventional business loans. Approval depends on the borrower's credit, equity injection, and in some cases whether the franchise brand is already on the SBA's pre-approved Franchise Registry.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "SBLOC (Securities-Backed Line of Credit)",
        definition:
          "A revolving credit line secured by an investment portfolio, including stocks, bonds, and ETFs, without requiring the assets to be sold. SBLOCs offer access to capital at relatively low interest rates and can be a faster, less disruptive alternative to liquidating investments. As a franchise funding tool, they are most useful as an equity injection or working capital supplement for buyers with a significant investment portfolio who want to avoid triggering capital gains taxes by selling.",
        related: "/resources/how-franchise-funding-actually-works",
        relatedLabel: "How franchise funding actually works",
      },
      {
        term: "Seller's Discretionary Earnings (SDE)",
        definition:
          "The key metric used to value owner-operated franchise businesses for resale. SDE equals the business's net income plus the owner's salary and benefits, plus interest, depreciation, amortization, and any one-time or personal expenses the owner ran through the business. It represents the total financial benefit available to a single owner-operator. Franchise resales are typically priced at 2x to 4x SDE, depending on brand strength, location, and growth trajectory. If you are buying an existing franchise rather than building from scratch, SDE is the number that determines whether the asking price is fair.",
        related: "/resources/what-is-your-time-worth-the-roi-math-of-franchise-ownership",
        relatedLabel: "The ROI math of franchise ownership",
      },
      {
        term: "Semi-Absentee Franchise",
        definition:
          "A franchise model designed to be operated by a manager rather than the owner full-time. The franchisee may work the business 10–20 hours per week, handling oversight, financials, and growth while a hired general manager handles day-to-day operations. Semi-absentee ownership typically requires a larger initial staff and more working capital, but it allows owners to remain in their current career while building a business.",
        related: "/resources/the-semi-absentee-franchise-real-talk",
        relatedLabel: "The semi-absentee franchise: real talk",
      },
      {
        term: "Single-Unit Franchise",
        definition:
          "An agreement granting you the rights to own and operate one franchise location. This is the most common starting point for first-time franchise buyers and the simplest ownership structure to manage. Some franchise systems are specifically designed for single-unit owner-operators, while others strongly prefer or require multi-unit commitments. Confirm whether the brands you are evaluating allow single-unit entry or require a multi-unit development agreement upfront.",
        related: "/resources/one-unit-or-multi-unit-what-first-timers-get-wrong",
        relatedLabel: "One unit or multi-unit: what first-timers get wrong",
      },
      {
        term: "System-Wide Sales",
        definition:
          "The total gross revenue generated across all franchise units in a system, often cited by franchisors in marketing materials as a measure of scale. System-wide sales figures can be impressive but require context. A high number across 500 locations tells you less than understanding what the average individual unit generates. When evaluating a brand's financial health, unit-level economics from Item 19 matter far more than system-wide totals.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: what actually matters",
      },
    ],
  },
  {
    letter: "T",
    entries: [
      {
        term: "Tenant Improvement Allowance (TIA)",
        definition:
          "Money your landlord contributes toward the cost of building out and customizing your leased space to meet the franchise brand's design specifications. TIAs can range from $10 to $100 or more per square foot depending on the market, lease length, and landlord. Negotiating a strong TIA is one of the most impactful financial moves a new franchisee can make. It directly reduces your out-of-pocket initial investment. Ask the franchisor what TIA amounts are typical for the brand in your market, and factor this into your site selection process.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
      {
        term: "Term (Franchise Term)",
        definition:
          "The initial length of a franchise agreement, most commonly 10 years, though some brands use 5-year or 20-year terms. After the initial term, the franchisee typically has the option to renew if they are in good standing. The term clock starts at signing, not at the unit's opening date. A 10-year term on a business that takes 18 months to ramp up means roughly 8.5 years of productive operating time before renewal or exit decisions arise.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Territory",
        definition:
          "A defined geographic region, usually by zip codes, population thresholds, or county lines, within which a franchisee holds exclusive rights to operate under the brand. Territory definitions and enforcement vary significantly by brand. Some franchisors offer protected territories (competitors of the same brand cannot open nearby); some do not. Territory rights are defined in FDD Item 12.",
        related: "/resources/how-to-pick-a-franchise-territory",
        relatedLabel: "How to pick a franchise territory",
      },
      {
        term: "Trade Dress",
        definition:
          "The total visual identity of a franchise location: the distinctive combination of colors, signage, architectural features, interior layout, fixtures, and decor that makes the brand instantly recognizable. Think the golden arches or Starbucks' signature interior. Trade dress is legally protected intellectual property owned by the franchisor. As a franchisee, you must maintain trade dress standards at your own expense, and franchisors periodically require costly remodels every 5 to 10 years to keep locations current. Factor potential remodel costs into your long-term financial planning.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and cannot negotiate",
      },
      {
        term: "Transfer Fee",
        definition:
          "A fee paid to the franchisor when a franchise unit is sold from one owner to another. Transfer fees cover the franchisor's cost of processing the new franchisee application, providing training, and updating agreements. They typically range from $5,000–$25,000 and are disclosed in FDD Item 6. Understanding transfer fees is part of exit planning, as they directly affect the net proceeds a seller receives.",
        related: "/resources/the-franchise-agreement-what-you-can-and-cant-negotiate",
        relatedLabel: "What you can and can't negotiate",
      },
      {
        term: "Triple-A Brand",
        definition:
          "A term used at Waypoint to describe franchise brands that occupy the optimal position for first-time buyers: mature enough to have proven systems, real support infrastructure, and a track record worth trusting, but not so oversaturated that the best territories are gone. Major-league brands (household names) offer name recognition but limited open territory. Triple-A brands offer open territory, growing demand, and the operational depth of an established system. Finding a Triple-A brand in the right category for the right buyer is the core of the matching process.",
        related: "/resources/big-name-vs-emerging-which-franchise-to-buy",
        relatedLabel: "Big name vs. emerging: which franchise to buy",
      },
      {
        term: "Turnkey",
        definition:
          "A franchise location delivered to you fully built out, equipped, stocked, and ready to operate. You turn the key and open for business on day one. The franchisor handles all construction, design, equipment installation, and initial inventory. Turnkey setups significantly reduce the complexity and project management burden of opening, but they typically come at a premium price compared to managing the build-out yourself. Compare turnkey pricing against self-managed costs to decide which approach fits your budget and comfort level.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
    ],
  },
  {
    letter: "U",
    entries: [
      {
        term: "Unit Economics",
        definition:
          "The financial performance of a single franchise unit, including revenue, cost of goods, labor, royalties, rent, and other operating expenses, expressed as a model showing whether the business is profitable at the unit level and by how much. Strong unit economics are the foundation of any sound franchise investment decision. They are best understood by analyzing Item 19 of the FDD alongside direct conversations with existing franchisees. A brand with great marketing but weak unit economics will always produce struggling franchisees.",
        related: "/resources/what-is-your-time-worth-the-roi-math-of-franchise-ownership",
        relatedLabel: "The ROI math of franchise ownership",
      },
    ],
  },
  {
    letter: "V",
    entries: [
      {
        term: "Validation Call",
        definition:
          "A conversation between a prospective franchisee and one or more existing franchise owners in the system, conducted without the franchisor present. Validation calls are typically arranged through the franchisor's development team, but serious candidates should also pick names directly from the Item 20 franchisee contact list. This is one of the most important steps in due diligence. Existing owners have no incentive to oversell the opportunity and often share candid information about support quality, what the first year is really like, and where the brand falls short.",
        related: "/resources/fdd-decoded-what-actually-matters",
        relatedLabel: "FDD decoded: Item 20 explained",
      },
      {
        term: "Van-Based Franchise",
        definition:
          "A mobile franchise model where the primary delivery vehicle is a branded van or truck. Van-based franchises, including mobile pet grooming, window cleaning, pressure washing, and handyman services, offer the flexibility of a home-based business with capacity for consistent route-based revenue. They scale by adding vehicles and technicians. Success depends on scheduling efficiency, vehicle maintenance, and service quality consistency across a growing fleet.",
        related: "/resources/home-services-franchises-most-overlooked-category",
        relatedLabel: "Home services franchises: most overlooked category",
      },
    ],
  },
  {
    letter: "W",
    entries: [
      {
        term: "Working Capital",
        definition:
          "The cash reserved to fund day-to-day operations during the ramp-up period, before the business generates enough revenue to cover its own costs. Working capital is one of the most frequently underestimated line items in franchise budgets. FDD Item 7 discloses an estimated range, but the actual amount you need depends on how long your category typically takes to reach break-even, your local market, and how conservatively you want to operate. Most advisors recommend funding at least six months of projected operating expenses before opening.",
        related: "/investment",
        relatedLabel: "Full franchise investment guide",
      },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossarySchema) }}
      />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-12 sm:pb-16 px-6 border-b border-[#e8e0d0]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
            Franchise Glossary
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#0c1929] leading-tight mb-6 max-w-2xl">
            Franchise terms, explained plainly
          </h1>
          <p className="text-base text-[#4a4a3e] leading-relaxed max-w-xl">
            Every term you will encounter when evaluating a franchise: FDD items, royalty, territory, discovery day, ROBS, unit economics, non-compete clauses, and more, all defined in plain language without jargon. 90+ entries. Last updated: March 2026.
          </p>
        </div>
      </section>

      {/* Alphabet nav */}
      <section className="border-b border-[#e8e0d0] bg-[#f0ede8] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-4 flex-wrap">
          {terms.map(({ letter }) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="text-xs font-semibold text-[#8E3012] hover:text-[#0c1929] transition-colors tracking-wider"
            >
              {letter}
            </a>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-14">
        {terms.map(({ letter, entries }) => (
          <div key={letter} id={`letter-${letter}`} style={{ scrollMarginTop: "100px" }}>
            <div className="flex items-center gap-4 mb-8">
              <span className="font-playfair text-4xl text-[#C8622E]/40 leading-none">{letter}</span>
              <div className="flex-1 h-px bg-[#e8e0d0]" />
            </div>
            <div className="space-y-8">
              {entries.map(({ term, definition, related, relatedLabel }) => (
                <div key={term} className="grid sm:grid-cols-[200px_1fr] gap-4 sm:gap-8 pl-4">
                  <div>
                    <h2 className="font-playfair text-lg text-[#0c1929] leading-snug">{term}</h2>
                  </div>
                  <div>
                    <p className="text-sm text-[#3a3a2e] leading-relaxed mb-3">{definition}</p>
                    {related && relatedLabel && (
                      <Link
                        href={related}
                        className="text-xs text-[#8E3012] font-medium hover:text-[#C8622E] transition-colors"
                      >
                        {relatedLabel} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-[#0c1929] py-14 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">
          Know the terms. Now let&apos;s find the right fit.
        </p>
        <p className="text-white/70 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
          Understanding the vocabulary is step one. A free 30-minute conversation with Kelsey is step two.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#C8622E] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
          </Link>
          <Link
            href="/scorecard"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            Take the Readiness Quiz
          </Link>
          <a
            href="sms:+12149951062"
            className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
          >
            Or text me &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
