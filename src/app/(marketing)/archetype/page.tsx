import { Metadata } from "next";
import ArchetypeClient from "./ArchetypeClient";

export const metadata: Metadata = {
  title: "What Kind of Franchise Owner Are You? | Waypoint Franchise Advisors",
  description:
    "Take the Franchise Archetype Quiz. 8 questions to discover your franchise personality type, the industries you're wired for, and the ones to avoid. Free, no sales pitch.",
  openGraph: {
    title: "What Kind of Franchise Owner Are You?",
    description:
      "Discover your franchise archetype and which industries align with your goals, background, and working style.",
    url: "https://waypointfranchise.com/archetype",
    type: "website",
  },
};

export default function ArchetypePage() {
  return <ArchetypeClient />;
}
