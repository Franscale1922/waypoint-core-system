import type { Metadata } from "next";
import ScorecardClient from "./ScorecardClient";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema, scorecardFaqSchema, scorecardFaqs } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";
import { FAQItem } from "../faq/FAQItem";

export const metadata: Metadata = {
  title: "Franchise Readiness Quiz | Are You Ready to Own a Franchise?",
  description:
    "Take the two-minute franchise readiness quiz and get a score based on your capital, timeline and motivation. Free and honest, from a former franchisor.",
  alternates: { canonical: "https://www.waypointfranchise.com/scorecard" },
  openGraph: {
    title: "Franchise Readiness Quiz | Waypoint Franchise Advisors",
    description:
      "5 questions. 2 minutes. Get an honest read on where you stand before making one of the biggest financial decisions of your life.",
    url: "https://www.waypointfranchise.com/scorecard",
    images: [
      {
        url: "/og_scorecard_1773343944094.png",
        width: 1200,
        height: 630,
        alt: "Franchise Readiness Quiz | Waypoint Franchise Advisors",
      },
    ],
  },
};

export default function ScorecardPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          webPageSchema({
            url: `${SITE_URL}/scorecard`,
            name: "Franchise Readiness Quiz | Waypoint Franchise Advisors",
            description:
              "Take the 2-minute franchise readiness quiz. Get a personalized score based on your capital, timeline, and motivation. Free, honest, no-pitch results from a former franchisor.",
            breadcrumb: breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Readiness Quiz", url: `${SITE_URL}/scorecard` },
            ]),
          }),
          scorecardFaqSchema,
        )}
      />
      <ScorecardClient />
      {/* Visible FAQ: rendered from the same scorecardFaqSchema source that feeds the
          FAQPage markup above, so on-page content and structured data cannot drift. */}
      <section className="max-w-3xl mx-auto px-6 py-14 sm:py-20 border-t border-[#e8e0d0]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-4">
          Common Questions
        </p>
        <h2 className="font-playfair text-2xl sm:text-3xl mb-6 text-[#0c1929]">
          Questions about the readiness quiz
        </h2>
        <div>
          {scorecardFaqs.map(({ q, a }) => (
            <FAQItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>
    </>
  );
}
