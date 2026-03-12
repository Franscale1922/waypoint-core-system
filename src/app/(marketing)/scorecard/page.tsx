import type { Metadata } from "next";
import ScorecardClient from "./ScorecardClient";
import { scorecardFaqSchema } from "../../lib/structured-data";

export const metadata: Metadata = {
  title: "Franchise Readiness Quiz — Are You Ready to Own a Franchise?",
  description:
    "Take the 2-minute franchise readiness quiz. Get a personalized score based on your capital, timeline, and motivation. Free, honest, no-pitch results from a former franchisor.",
  alternates: { canonical: "https://waypointfranchise.com/scorecard" },
  openGraph: {
    title: "Franchise Readiness Quiz | Waypoint Franchise Advisors",
    description:
      "5 questions. 2 minutes. Get an honest read on where you stand before making one of the biggest financial decisions of your life.",
    url: "https://waypointfranchise.com/scorecard",
    images: [
      {
        url: "/og-scorecard.png",
        width: 1200,
        height: 630,
        alt: "Franchise Readiness Quiz — Waypoint Franchise Advisors",
      },
    ],
  },
};

export default function ScorecardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scorecardFaqSchema) }}
      />
      <ScorecardClient />
    </>
  );
}
