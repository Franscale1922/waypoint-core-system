// Franchise financing content: single source of truth.
// Consumed by the /franchise-financing React page AND its markdown view
// (src/lib/markdown-views.ts), so HTML and markdown can never drift.
//
// FTC note: educational only, no earnings claims, no promises of approval.

export type FinancingMethod = {
  method: string;
  how: string;
  bestFor: string;
  watch: string;
  guideSlug?: string; // when set, the pillar links this row to /franchise-financing/<guideSlug>
};

export type FinancingFaq = { q: string; a: string };

export const financingMethods: FinancingMethod[] = [
  {
    method: "SBA 7(a) loan",
    how: "A bank loan partially guaranteed by the Small Business Administration. The most common path for franchise financing when the brand is on the SBA Franchise Directory.",
    bestFor: "Buyers with solid credit and some liquid capital for the down payment who want a long term and competitive rates.",
    watch: "Requires a down payment, personal guarantee, and often collateral. The brand must be SBA-eligible. Underwriting takes time.",
    guideSlug: "sba-loans",
  },
  {
    method: "ROBS (401(k) rollover)",
    how: "Rolls eligible retirement funds into the new business without an early-withdrawal penalty or income tax, because it is a rollover, not a distribution.",
    bestFor: "Buyers with substantial retirement savings who want to reduce or avoid debt and inject equity into the business.",
    watch: "You are putting retirement capital at business risk. Has setup and ongoing compliance requirements; use a specialist provider.",
    guideSlug: "robs-401k-rollover",
  },
  {
    method: "Home equity (HELOC / cash-out)",
    how: "Borrows against the equity in your primary residence, either as a line of credit or a cash-out refinance.",
    bestFor: "Homeowners with significant equity who want flexible, relatively low-rate access to capital.",
    watch: "Your home is the collateral. Rates can be variable. Borrowing against a residence raises the personal stakes.",
    guideSlug: "home-equity",
  },
  {
    method: "Securities-backed line",
    how: "A line of credit borrowed against a brokerage portfolio without selling the investments (also called a portfolio or pledged-asset line).",
    bestFor: "Buyers with a sizable taxable investment portfolio who want liquidity without triggering capital-gains taxes.",
    watch: "Market drops can trigger a margin call. Rates are typically variable. Not a fit if your assets are mostly in retirement accounts.",
  },
  {
    method: "Franchisor financing",
    how: "Financing offered directly by the brand: fee deferral, reduced or waived fees for certain candidates, or in-house equipment financing.",
    bestFor: "Candidates buying brands that publish financing in Item 10 of their FDD, or who qualify for incentive programs (e.g., veterans).",
    watch: "Less common and varies brand to brand. Always confirm the specifics in Item 10 rather than assuming.",
  },
];

// Deep-dive guide pages clustered under the /franchise-financing pillar
// (/franchise-financing/[slug]). Each is a fuller, single-method explainer that
// targets a specific high-intent query (e.g. "SBA loan for a franchise"). The
// pillar links down to these; these link back up to the pillar.
export type FinancingGuide = {
  slug: string;
  name: string;          // short label, e.g. "SBA Loans"
  metaTitle: string;
  metaDescription: string;
  heroTagline: string;
  intro: string;
  howItWorks: string;
  whoItFits: string;
  watchFor: string;
  faqs: FinancingFaq[];
  relatedArticleSlug?: string;
  relatedArticleTitle?: string;
};

export const financingGuides: FinancingGuide[] = [
  {
    slug: "sba-loans",
    name: "SBA Loans",
    metaTitle: "SBA Loans for Franchises: How the 7(a) Program Works",
    metaDescription:
      "How SBA 7(a) loans work for buying a franchise: eligibility, the franchise directory, down payment and collateral, and what to expect from underwriting.",
    heroTagline: "The most common franchise loan: bank-issued, partially SBA-guaranteed, for directory-listed brands.",
    intro:
      "The SBA 7(a) program is the path most people mean when they say they are 'getting a loan' for a franchise. The loan itself comes from a bank or SBA-preferred lender; the Small Business Administration guarantees a portion, which lowers the lender's risk and makes longer terms and competitive rates possible for a first-time business owner.",
    howItWorks:
      "You apply through an SBA lender, not the SBA directly. The lender underwrites you on credit, experience, the business projections, and collateral, then issues the loan with an SBA guarantee on part of the balance. Expect a down payment (commonly a meaningful percentage of the total project), a personal guarantee, and often a lien on available collateral. For franchises specifically, the brand generally needs to appear on the SBA Franchise Directory for the deal to qualify.",
    whoItFits:
      "It tends to fit buyers with solid personal credit, some liquid capital for the down payment, and a clean financial history, who want to preserve cash by financing the bulk of the investment over a long term. It is less of a fit if you cannot cover the down payment or want zero personal liability.",
    watchFor:
      "Underwriting takes time (weeks, sometimes longer), so start early. The brand must be SBA-eligible; confirm its current directory status (the rules and process have changed in recent years). The personal guarantee means your personal assets are on the line. And SBA eligibility for you personally is never guaranteed. It depends on your full financial picture.",
    faqs: [
      {
        q: "Can I use an SBA loan to buy a franchise?",
        a: "Often, yes, if the brand is listed on the SBA Franchise Directory and you personally qualify. The SBA 7(a) program is the most common loan used to buy a franchise. The loan is issued by a bank or SBA-preferred lender with a partial SBA guarantee; you apply through the lender, not the SBA.",
      },
      {
        q: "How much of a down payment does an SBA franchise loan require?",
        a: "It varies by lender and deal, but SBA loans typically require a down payment that is a meaningful percentage of the total project cost, plus a personal guarantee and often collateral. The exact figure depends on your financials and the lender's underwriting. A lender can give you a real number once they review your situation.",
      },
      {
        q: "How long does SBA loan approval take?",
        a: "It varies, but SBA underwriting generally takes several weeks and sometimes longer, depending on the lender and how complete your documentation is. Starting the conversation early (before you have picked a brand) helps avoid delays later in the process.",
      },
    ],
    relatedArticleSlug: "sba-loan-vs-robs-franchise-funding-comparison",
    relatedArticleTitle: "SBA loan vs. ROBS",
  },
  {
    slug: "robs-401k-rollover",
    name: "ROBS (401k Rollover)",
    metaTitle: "ROBS: Using 401(k) Funds to Buy a Franchise (Penalty-Free)",
    metaDescription:
      "How ROBS lets you fund a franchise with retirement savings and no early-withdrawal penalty: how it works, who it fits, and the compliance rules to know.",
    heroTagline: "Fund the business with retirement savings (penalty-free, tax-deferred, debt-free) via an IRS-recognized rollover.",
    intro:
      "ROBS (Rollover for Business Startups) lets you use eligible retirement funds to capitalize a franchise without triggering an early-withdrawal penalty or income tax. Because it is structured as a rollover rather than a distribution, the money moves into the business as equity, not debt, which is why people who want to avoid or reduce a loan often reach for it.",
    howItWorks:
      "A specialist provider sets up a new C-corporation and a 401(k) plan for that corporation. Your existing eligible retirement funds roll into the new plan, which then invests in the company's stock, capitalizing the business with your own retirement money. It is an IRS-recognized structure, but the mechanics are specific and must be done correctly, which is why people use a ROBS provider rather than attempting it alone.",
    whoItFits:
      "It tends to fit buyers with substantial retirement savings who want to inject equity and minimize debt, or who need the funds for an SBA down payment. It is also used in combination with a loan rather than alone.",
    watchFor:
      "You are putting retirement capital at business risk. If the business struggles, those funds are exposed. ROBS carries setup costs and ongoing compliance and administration requirements (the C-corp and plan must be maintained properly). This is a structure to enter with eyes open and professional guidance, not a loophole.",
    faqs: [
      {
        q: "Can I use my 401(k) to buy a franchise without a penalty?",
        a: "Yes, through a structure called ROBS (Rollover for Business Startups). It moves eligible retirement funds into the business as a rollover rather than a distribution, so there is no early-withdrawal penalty or income tax at the time of funding. It is IRS-recognized but has specific mechanics and ongoing compliance, so most people set it up through a specialist provider.",
      },
      {
        q: "Is ROBS risky?",
        a: "It carries a real, specific risk: you are putting retirement capital into the business, so if the business fails those funds are exposed. It also has setup costs and ongoing compliance obligations. Many buyers still choose it to avoid debt or fund an SBA down payment, but it is a decision to make deliberately, with professional advice.",
      },
      {
        q: "Can I combine ROBS with an SBA loan?",
        a: "Yes. A common approach is to use ROBS for the equity injection or down payment and an SBA loan for the balance. A funding specialist can model the mix once they know the total investment a given concept requires.",
      },
    ],
    relatedArticleSlug: "sba-loan-vs-robs-franchise-funding-comparison",
    relatedArticleTitle: "SBA loan vs. ROBS",
  },
  {
    slug: "home-equity",
    name: "Home Equity",
    metaTitle: "Using Home Equity (HELOC) to Finance a Franchise",
    metaDescription:
      "How home equity (a HELOC or cash-out refinance) can fund a franchise, who it fits, and the risks of borrowing against your residence.",
    heroTagline: "Flexible, relatively low-rate capital from the equity in your home, with your residence as collateral.",
    intro:
      "For homeowners with significant equity, a home equity line of credit (HELOC) or a cash-out refinance can be a flexible, relatively low-cost way to fund part of a franchise investment. It is often used to supplement other sources rather than as the sole funding method.",
    howItWorks:
      "A HELOC gives you a revolving line of credit secured by your home, which you can draw on as needed during the project. A cash-out refinance replaces your existing mortgage with a larger one and gives you the difference in cash. Both convert home equity into available capital; both use your residence as collateral.",
    whoItFits:
      "It tends to fit homeowners with substantial equity who want flexible access to capital at a lower rate than unsecured borrowing, and who are comfortable with the tradeoff of securing business funding against their home.",
    watchFor:
      "The central risk is straightforward: your home is the collateral. HELOC rates are often variable, so payments can rise. Borrowing against your residence to fund a business raises the personal stakes meaningfully. Weigh it carefully and consider how it fits alongside other sources before committing.",
    faqs: [
      {
        q: "Can I use a HELOC to buy a franchise?",
        a: "Yes. Many homeowners use a HELOC or a cash-out refinance to fund part of a franchise investment, often alongside other sources. It converts your home equity into available capital, typically at a lower rate than unsecured borrowing, but your home secures the debt.",
      },
      {
        q: "Is using home equity to fund a franchise a good idea?",
        a: "It depends on your situation and risk tolerance. The upside is flexible, relatively low-rate capital; the downside is that your residence is the collateral and HELOC rates are often variable. It is a personal decision best made after looking at all your funding options together, ideally with professional advice.",
      },
    ],
    relatedArticleSlug: "how-franchise-funding-actually-works",
    relatedArticleTitle: "How franchise funding actually works",
  },
];

export function getFinancingGuide(slug: string): FinancingGuide | undefined {
  return financingGuides.find((g) => g.slug === slug);
}

export const financingFaqs: FinancingFaq[] = [
  {
    q: "How much money do I need to finance a franchise?",
    a: "It varies widely by concept. Lenders typically look at how much liquid capital you can put toward the deal and how much you need to borrow. Many lower-investment service franchises have total investments that can be reached with a relatively modest amount of liquid capital once financing is layered in, while larger build-out concepts need substantially more. The right question is not just 'how much do I have' but 'which financing method fits the total investment and my situation.'",
  },
  {
    q: "Can I use my 401(k) to fund a franchise without an early-withdrawal penalty?",
    a: "Yes, through a structure called ROBS (Rollover for Business Startups). It lets you move eligible retirement funds into the business without triggering an early-withdrawal penalty or income tax, because it is a rollover rather than a distribution. It is a real, IRS-recognized structure, but it has compliance requirements and ongoing administration. Most people set it up through a specialist provider, not on their own.",
  },
  {
    q: "Are franchises eligible for SBA loans?",
    a: "Many are. The SBA maintains a Franchise Directory, and a brand listed there is generally eligible for SBA-backed financing such as the 7(a) program, assuming you personally qualify. Eligibility rules and the directory process have changed in recent years, and not every brand is listed, so confirm a specific brand's current status before you assume an SBA loan is on the table.",
  },
  {
    q: "How much of the total investment can I finance?",
    a: "It depends on the method and the lender. SBA loans often require a down payment (commonly a meaningful percentage of the project), so you are financing the majority but not all. ROBS can fund a larger share because it uses your own retirement capital. Home equity and securities-backed lines depend on the equity or portfolio you can borrow against. A consultant or lender can model the mix once they know the concept's total investment.",
  },
  {
    q: "Do franchisors offer their own financing?",
    a: "Some do, in the form of fee deferral, reduced or waived franchise fees for certain candidates (veterans, for example), or in-house equipment financing. It is less common than third-party financing and varies brand to brand. Item 10 of a brand's Franchise Disclosure Document spells out exactly what financing, if any, the franchisor offers.",
  },
];
