import type { Metadata } from "next";
import ScorecardClient from "./ScorecardClient";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema, scorecardFaqSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";

export const metadata: Metadata = {
  title: "Franchise Readiness Quiz | Are You Ready to Own a Franchise?",
  description:
    "Take the 2-minute franchise readiness quiz. Get a personalized score based on your capital, timeline, and motivation. Free, honest, no-pitch results from a former franchisor.",
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
    </>
  );
}
