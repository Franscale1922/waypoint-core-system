import type { Metadata } from "next";
import GuideForm from "./GuideForm";
import { SITE_URL, jsonLdGraph, webPageSchema, breadcrumbSchema } from "../../lib/structured-data";
import JsonLd from "../../components/JsonLd";

export const metadata: Metadata = {
  title: "Franchise Interview Guide",
  description:
    "Fifteen questions to ask any franchise brand, in a worksheet you fill out right in your browser. Fill one per brand, save or print it, and see which one actually fits.",
  alternates: { canonical: "https://www.waypointfranchise.com/guide" },
  openGraph: {
    title: "Franchise Interview Guide | Waypoint Franchise Advisors",
    description:
      "Fifteen questions to ask any franchise brand. Fill it out per brand, save or print, and compare honestly. Free, no sign-up.",
    url: "https://www.waypointfranchise.com/guide",
  },
};

export default function GuidePage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd
        data={jsonLdGraph(
          webPageSchema({
            url: `${SITE_URL}/guide`,
            name: "Franchise Interview Guide | Waypoint Franchise Advisors",
            description:
              "Fifteen questions to ask any franchise brand, in a worksheet you fill out in your browser. Fill one per brand, save or print, and compare.",
            mainEntityId: `${SITE_URL}/#service`,
            breadcrumb: breadcrumbSchema([
              { name: "Home", url: SITE_URL },
              { name: "Interview Guide", url: `${SITE_URL}/guide` },
            ]),
          }),
        )}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <GuideForm />
      </section>
    </main>
  );
}
