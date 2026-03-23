import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "../../components/EmailCapture";

export const metadata: Metadata = {
  title: "Free Franchise Checklists | Waypoint Franchise Advisors",
  description:
    "Download free franchise readiness checklists for every major category — food and beverage, home services, fitness, senior care, and B2B. Built from real advisory experience.",
  openGraph: {
    title: "Free Franchise Checklists | Waypoint Franchise Advisors",
    description:
      "Free checklists for franchise candidates at every stage of evaluation. Pick the one that matches your industry and get started.",
    url: "https://www.waypointfranchise.com/checklists",
    images: [{ url: "/og/og-resources.png", width: 1200, height: 630, alt: "Waypoint Franchise Checklists" }],
  },
  alternates: { canonical: "https://www.waypointfranchise.com/checklists" },
};

interface Checklist {
  slug: string;
  label: string;
  title: string;
  description: string;
}

const CHECKLISTS: Checklist[] = [
  {
    slug: "universal",
    label: "All Categories",
    title: "Universal Franchise Readiness Checklist",
    description:
      "The starting point for any serious franchise evaluation. Covers capital readiness, lifestyle fit, risk tolerance, and the questions to ask before you go further with any concept.",
  },
  {
    slug: "food-and-beverage",
    label: "Food & Beverage",
    title: "Food & Beverage Franchise Checklist",
    description:
      "Purpose-built for restaurant, fast casual, and QSR concepts. Covers build-out requirements, perishable inventory, staffing models, and the unit economics questions that matter most in food service.",
  },
  {
    slug: "home-services",
    label: "Home Services",
    title: "Home Services Franchise Checklist",
    description:
      "Covers cleaning, restoration, junk removal, landscaping, painting, pest control, and adjacent trades. Focuses on territory size, recurring revenue structure, and staffing model.",
  },
  {
    slug: "fitness-wellness",
    label: "Fitness & Wellness",
    title: "Fitness & Wellness Franchise Checklist",
    description:
      "Built for boutique studios, gyms, yoga, cycling, massage, and med spa concepts. Covers membership economics, staffing and certification requirements, and the real estate cost structure.",
  },
  {
    slug: "senior-care",
    label: "Senior Care",
    title: "Senior Care Franchise Checklist",
    description:
      "Covers home care, companion care, and assisted living franchises. Addresses licensing requirements by state, caregiver retention, and the referral network model that drives this category.",
  },
  {
    slug: "b2b",
    label: "B2B Services",
    title: "B2B Franchise Checklist",
    description:
      "For staffing, managed IT, fleet maintenance, logistics, and business consulting concepts. Focuses on client acquisition model, recurring contract structure, and the sales skills that make or break B2B operators.",
  },
];

export default function ChecklistsPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      {/* Hero */}
      <section className="bg-[#0c1929] pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-4">
            Free Downloads
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-white mb-5 leading-tight">
            The checklists I use<br className="hidden sm:block" /> before every first conversation.
          </h1>
          <p className="text-white/65 text-lg max-w-2xl leading-relaxed">
            Six checklists — one universal and five industry-specific. Pick the one that matches
            the category you are exploring. Enter your email and it lands in your inbox within minutes.
          </p>
        </div>
      </section>

      {/* Checklist grid */}
      <section className="max-w-6xl mx-auto px-5 sm:px-10 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {CHECKLISTS.map((checklist) => (
            <div
              key={checklist.slug}
              id={`checklist-${checklist.slug}`}
              className="bg-white border border-[#e2ddd2] rounded-xl p-6 sm:p-8 flex flex-col gap-5 h-full"
            >
              {/* Label + title */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-2">
                  {checklist.label}
                </p>
                <h2 className="font-playfair text-lg sm:text-xl text-[#0c1929] leading-snug mb-3">
                  {checklist.title}
                </h2>
                <p className="text-sm text-[#5a5a4a] leading-relaxed">
                  {checklist.description}
                </p>
              </div>

              {/* Inline email capture */}
              <div className="mt-auto">
                <EmailCapture
                  variant="card"
                  checklistSlug={checklist.slug}
                  articleSlug="checklists-page"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA — matches resources page */}
      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Rather talk it through?</p>
        <p className="text-white/70 mb-8 max-w-md mx-auto">
          The fastest way to know which checklist actually applies to your situation is a real conversation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]"
          >
            Book a Free Call
          </Link>
          <Link
            href="/resources"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
          >
            Browse All Resources
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/40">
          Not sure which category fits?{" "}
          <Link href="/scorecard" className="text-white/60 hover:text-white/80 underline transition-colors">
            Take the Readiness Quiz &rarr;
          </Link>
        </p>
      </section>
    </main>
  );
}
