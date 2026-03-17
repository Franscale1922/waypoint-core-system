import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllArticles, getArticlesByCategory } from "../../../lib/articles";
import ResourcesGrid from "../../components/ResourcesGrid";
import EmailCapture from "../../components/EmailCapture";

export const metadata: Metadata = {
  title: "Franchise Resources | Waypoint Franchise Advisors",
  description: "Guides, articles, and tools for anyone seriously exploring franchise ownership. No pitch, no agenda.",
  openGraph: {
    title: "Franchise Resources | Waypoint Franchise Advisors",
    description: "Guides, articles, and tools for anyone seriously exploring franchise ownership.",
    url: "https://waypointfranchise.com/resources",
    images: [{ url: "/og/og-resources.png", width: 1200, height: 630, alt: "Waypoint Franchise Resources" }],
  },
  alternates: { canonical: "https://waypointfranchise.com/resources" },
};

export default function ResourcesPage() {
  const grouped = getArticlesByCategory();
  const allArticles = getAllArticles();
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <Image
          src="/images/resources-hero-dock-sunset.png"
          alt="Wooden dock on a Montana lake at sunset"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 20%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929]/65 via-[#0c1929]/25 to-[#0c1929]/05" />
        {/* Left scrim — covers the text zone over the bright sunset horizon */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1
            className="font-playfair text-4xl sm:text-6xl text-white mb-6"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
          >
            What you should know<br className="hidden sm:block" /> before you start looking
          </h1>
          <p
            className="text-white text-lg max-w-xl leading-relaxed"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.9), 0 2px 20px rgba(0,0,0,0.7)" }}
          >
            Practical writing from someone who has been a franchisor, a franchisee, and now an advisor. No pitch, no agenda.
          </p>
        </div>
      </section>
      <ResourcesGrid grouped={grouped} allArticles={allArticles} />

      {/* B-6: Email capture — research-mode visitors */}
      <section className="max-w-4xl mx-auto px-5 sm:px-10 py-12">
        <EmailCapture />
      </section>

      <section className="bg-[#0c1929] py-16 px-6 text-center">
        <p className="font-playfair text-2xl text-white mb-4">Rather talk it through?</p>
        <p className="text-white/70 mb-8 max-w-md mx-auto">The fastest way to get a real answer is a real conversation.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/book" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#C8622E] hover:bg-[#D4724A] rounded-lg transition-all min-h-[48px]">Book a Free Call</Link>
          <Link href="/scorecard" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg transition-all min-h-[48px]">Take the Readiness Quiz</Link>
          <a href="sms:+12149951062" className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2">Or text me &rarr;</a>
        </div>
        <p className="mt-6 text-sm text-white/40">
          Not sure how the process works?{" "}
          <Link href="/process" className="text-white/60 hover:text-white/80 underline transition-colors">See the full process &rarr;</Link>
        </p>
      </section>
    </main>
  );
}
