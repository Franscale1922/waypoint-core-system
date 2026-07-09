import { Metadata } from "next";
import ArchetypeClient from "./ArchetypeClient";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";

export const metadata: Metadata = {
  title: "What Kind of Franchise Owner Are You?",
  description:
    "Take the Franchise Archetype Quiz. 8 questions to discover your franchise personality type, the industries you're wired for, and the ones to avoid. Free, no sales pitch.",
  alternates: { canonical: "https://www.waypointfranchise.com/archetype" },
  openGraph: {
    title: "What Kind of Franchise Owner Are You?",
    description:
      "Discover your franchise archetype and which industries align with your goals, background, and working style.",
    url: "https://www.waypointfranchise.com/archetype",
    type: "website",
  },
};

export default function ArchetypePage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          webPageSchema({
            url: `${SITE_URL}/archetype`,
            name: "What Kind of Franchise Owner Are You? | Waypoint Franchise Advisors",
            description:
              "The Franchise Archetype Quiz: 8 questions to discover your franchise personality type, the industries you're wired for, and the ones to avoid. Free, no sales pitch.",
            breadcrumb: breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Archetype Quiz", url: `${SITE_URL}/archetype` },
            ]),
          }),
        )}
      />
      <ArchetypeClient />
    </>
  );
}
