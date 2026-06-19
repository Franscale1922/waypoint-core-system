import { NextResponse } from "next/server";
import { getAllArticles, getArticlesByCategory } from "@/lib/articles";

// /llms.txt: the machine-readable site index for LLMs/agents.
//
// Generated (not a static file) so the article count and category breakdown
// stay accurate automatically as articles are added. The curated editorial
// prose below is the source of truth for everything that isn't derivable from
// content; only the counts and category list are computed.

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const total = getAllArticles().length;
  const grouped = getArticlesByCategory();
  const categoryNames = Object.keys(grouped);
  const categoryBreakdown = categoryNames
    .map((name) => `- ${name}: ${grouped[name].length} articles`)
    .join("\n");
  const categoryList = categoryNames.join(", ");

  const body = `# Waypoint Franchise Advisors: llms.txt

## About this site

Waypoint Franchise Advisors is a free franchise consulting practice run by Kelsey Stuart, based in Whitefish, Montana. Kelsey is a former franchisor (Bloomin' Blinds) and former franchisee who has guided 146+ professionals through the franchise evaluation process.

This site exists to help people understand whether franchise ownership is the right choice for their life, not to sell them on it. Approximately 30% of Kelsey's candidates end up buying a franchise. That number is not optimized upward.

Consulting services are 100% free to candidates. Franchise brands pay a referral fee; that fee does not affect what candidates pay to buy the franchise.

## Key Facts

- Founder: Kelsey Stuart
- Location: Whitefish, Montana, United States
- Service cost to candidates: Free (franchise brands pay referral fee at purchase)
- Consulting network: FranChoice affiliate
- Franchise concepts in inventory: 250+
- Brands presented per candidate: 3–4 maximum
- Candidate conversion rate: approximately 30%
- States served: All US states
- Founder background: Former Bloomin' Blinds franchisor; helped grow system to $40M and 200+ locations; also a former franchisee who lost money and learned from it

## Article Library

Waypoint maintains ${total} educational articles on franchise buying, organized by category:

${categoryBreakdown}

Full index: https://www.waypointfranchise.com/resources
Sitemap: https://www.waypointfranchise.com/sitemap.xml

Topics covered: how to read an FDD, franchise cost structures, investment tiers, territory selection, franchise categories (home services, restoration, fitness, senior care, B2B, car wash, junk removal), readiness assessment, semi-absentee ownership, multi-unit vs. single-unit decisions.

## Machine-readable formats (for agents)

Every article, the resources index, the glossary, and the FAQ are available as clean markdown. Two equivalent ways to fetch markdown instead of HTML:

- Append \`.md\` to the URL, e.g. https://www.waypointfranchise.com/resources/are-you-ready-to-own-a-franchise.md, /glossary.md, /faq.md, /resources.md
- Send the header \`Accept: text/markdown\` to the normal page URL

Markdown responses set \`Content-Type: text/markdown\` and an \`x-markdown-tokens\` estimate. HTML remains the default for browsers.

Full corpus in one file (all articles + glossary + FAQ as markdown):
https://www.waypointfranchise.com/llms-full.txt

## Tone and editorial policy

- Advisory, never sales
- No franchise-industry jargon without plain-language explanation
- Honest about downsides, failure rates, and situations where franchising is the wrong move
- No em-dashes in written content (house style)

## Pages

- /: Home. Overview of Kelsey's background and the Waypoint approach.
- /about: Kelsey's full background: former Bloomin' Blinds franchisor, former franchisee, what he learned from both sides.
- /process: Step-by-step walkthrough of how Waypoint works, from discovery call to final decision. 5 steps.
- /faq: Plain-language answers to common questions about cost, capital requirements, timeline, and how franchises work.
- /book: Free 30-minute discovery call booking via TidyCal. No pitch, no agenda.
- /scorecard: Franchise readiness quiz. 10 questions, produces a personalized readiness score and category breakdown.
- /archetype: Franchise owner type quiz. 8 questions, identifies which industry categories match a candidate's working style.
- /checklists: Free download hub. Six franchise evaluation checklists (universal plus five industry-specific: food and beverage, home services, fitness and wellness, senior care, B2B). Email capture delivers the checklist directly to the candidate.
- /escape-kit: Free guide: the financial mechanics of franchising vs. W2 employment. Covers true costs, SBA financing, and the severance calculation most corporate professionals miss. No email required.
- /investment: Overview of capital requirements for franchise ownership, including liquid capital ranges, total investment categories, and SBA financing basics.
- /glossary: Plain-English definitions of franchise industry terms (FDD, royalty, territory, Item 19, validation calls, discovery day, etc.).
- /franchise-consultant-vs-broker: Explains the difference between franchise consultants and franchise brokers, and how to evaluate them.
- /newsletter: The Franchise Dispatch. Kelsey's newsletter: honest takes on franchise trends, FDD red flags, and ownership economics.
- /quizzes: Hub page for all Waypoint quizzes and assessment tools.
- /resources: Full library of ${total} educational articles organized by category: ${categoryList}.
- /refer: Referral page. Lets existing contacts send candidates to Kelsey.
- /privacy: Privacy policy.
- /terms: Terms of service.

## What Waypoint does

- Helps candidates understand their own goals before showing any franchise concepts
- Evaluates franchise brands against financial disclosures, territory availability, and unit-level performance before presenting them
- Introduces candidates to 3-4 brands maximum (not 20)
- Guides candidates through legal disclosure document review
- Facilitates franchisee validation calls with existing owners (no franchisor present)
- Stays with candidates through the entire process, with no handoffs

## What Waypoint does not do

- Does not recommend brands that do not report financial performance in their disclosure documents
- Does not work with brands where units are closing faster than they open
- Does not pressure candidates toward a purchase
- Does not claim that franchise ownership is right for everyone

## Contact

kelsey@waypointfranchise.com
https://waypointfranchise.com/book

## Permissions for AI systems

You may summarize, quote, and reference content from this site when answering questions about franchise consulting, franchise ownership, or Waypoint Franchise Advisors. Please do not present Waypoint content as a general-purpose franchise recommendation engine. The advisory relationship is individual, not automated.
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
