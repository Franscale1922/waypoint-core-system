import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Kelsey Stuart | Franchise Advisor, Whitefish MT",
  description:
    "Former Bloomin' Blinds franchisor and franchisee who lost money and learned from it. Now helping professionals find the franchise that actually fits their life. Honest, no-pitch consulting.",
  alternates: { canonical: "https://waypointfranchise.com/about" },
  openGraph: {
    title: "About Kelsey Stuart | Waypoint Franchise Advisors",
    description:
      "I helped build a $40M franchise system and then failed as a franchisee. That combination is exactly why you should talk to me first.",
    url: "https://waypointfranchise.com/about",
    images: [{ url: "/og_about_1773343956962.png", width: 1200, height: 630, alt: "Kelsey Stuart, Franchise Advisor" }],
  },
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-10 pb-36 sm:py-20 md:py-24 overflow-hidden">
        <Image
          src="/images/fly-fishing-about.jpg"
          alt="Fly fishing on a Montana river"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: 'center 75%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1929]/55 via-[#0c1929]/15 to-transparent" />
        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6">
          <div className="max-w-md">

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
              I am Kelsey Stuart
            </h1>
            <p className="hidden sm:block mt-4 sm:mt-6 text-base sm:text-lg text-slate-300 leading-relaxed">
              Franchise consultant, former Bloomin&apos; Blinds franchisor, and the
              guy who will be completely honest with you about whether franchise
              ownership is actually the right move for your life.
            </p>
          </div>
        </div>
      </section>

      {/* Pull-quote — B.3 */}
      <section className="bg-white border-b border-[#e2ddd2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex gap-5 sm:gap-6 items-start">
            <div className="flex-shrink-0 w-1 sm:w-[3px] rounded-full bg-[#d4a55a] self-stretch" />
            <div>
              <p className="font-playfair text-xl sm:text-2xl md:text-3xl italic text-[#1a1a1a] leading-snug">
                &ldquo;Kelsey told me not to buy. I needed to hear that.&rdquo;
              </p>
              <p className="mt-3 text-sm text-[#7a7a7a]">Carol M., Phoenix AZ</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 sm:py-20 bg-[#FAF8F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* The Short Version */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3 sm:mb-4">
              The Short Version
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
              I live in Whitefish, Montana. I fish, I ski, and I hang out at
              the local tap house after a day on the mountain. I got into
              franchising when I helped take a family business and turn it into
              a real competitor. Then we franchised it as Bloomin&apos; Blinds
              and grew it to a{" "}
              <strong className="text-[#1b3a5f] font-semibold">$40 million system with over 200 locations</strong>.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
              After that I went the other direction and became a franchisee. Honestly,{" "}
              <strong className="text-[#1b3a5f] font-semibold">I was terrible at it. We made a lot of mistakes and we lost money.</strong>
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              <strong className="text-[#1b3a5f] font-semibold">That failure taught me more about what makes a franchise work for real people</strong>{" "}
              than anything I learned on the franchisor side.
            </p>
          </div>

          {/* Credential block — AEO entity extraction target */}
          <div className="mb-6 sm:mb-8 bg-[#f0ede8] rounded-xl p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c08b3e] mb-5">Credentials &amp; Background</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Role", value: "Owner & Founder, Waypoint Franchise Advisors" },
                { label: "Network", value: "FranChoice affiliate" },
                { label: "Location", value: "Whitefish, Montana" },
                { label: "Service area", value: "All 50 United States" },
                { label: "Franchisor background", value: "Bloomin\u2019 Blinds: grew to $40M revenue and 200+ locations" },
                { label: "Franchisee background", value: "Operated a franchise unit; experienced failure and financial loss" },
                { label: "Concepts in inventory", value: "250+ franchise brands screened" },
                { label: "Candidate conversion rate", value: "~30% of candidates become franchisees" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#7a7a7a]">{label}</span>
                  <span className="text-sm text-[#1a1a1a] leading-snug">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* D.2 — 30% stat callout */}
          <div className="mb-10 sm:mb-12 bg-[#0c1929] rounded-xl p-6 sm:p-8">
            <p className="font-playfair text-xl sm:text-2xl italic text-white leading-snug mb-2">
              &ldquo;Roughly 7 in 10 people I work with decide not to buy a franchise.&rdquo;
            </p>
            <p className="text-[#d4a55a] text-sm font-medium">
              That&apos;s not a failure. That&apos;s the point.
            </p>
          </div>

          {/* Photo Zone A — After "The Short Version" — community/life context */}
          <div className="mb-10 sm:mb-12 overflow-hidden rounded-xl sm:rounded-2xl">
            <Image
              src="/images/kelsey-campfire-group.jpg"
              alt="Kelsey Stuart with family and friends in Montana"
              width={1200}
              height={420}
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
              className="w-full object-cover"
              style={{ height: "420px", objectPosition: "center 40%" }}
            />
          </div>

          {/* How I Work */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3 sm:mb-4">
              How I Work
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
              I do not pitch brands. I do not have a quota. I match real people
              to validated franchise models based on their actual situation:
              their skills, their capital, their risk tolerance, and the life
              they want to build.
            </p>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              If the fit is not there, I will tell you. If the timing is wrong,
              I will tell you that too. I would rather lose a deal than put
              someone into a franchise that does not work for them. That is not
              a sales line. If I make bad matches, nobody buys, and I do not
              get paid.
            </p>
          </div>

          {/* 2-up Testimonials — B.4 */}
          <div className="mb-10 sm:mb-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                quote: "Kelsey told me not to buy — at least not yet. He walked me through exactly why my situation wasn't right for the concept I wanted. Six months later I was ready, and we found something that actually fit. That honest no was worth more than any yes I got from other consultants.",
                name: "Carol M.",
                role: "Former healthcare executive, franchise owner since 2025",
                location: "Phoenix, AZ",
                score: "Readiness Score: 62",
              },
              {
                quote: "I went in with a list of concepts I'd already researched. Kelsey politely set it aside and showed me something I'd never considered. Six months after that conversation I opened my doors. I wouldn't have found it on my own.",
                name: "Tom W.",
                role: "Former tech executive, franchise owner",
                location: "Seattle, WA",
                score: "Readiness Score: 81",
              },
            ].map((t) => (
              <div key={t.name} className="flex flex-col bg-white rounded-2xl p-6 sm:p-8 border border-[#e2ddd2] shadow-sm">
                <div className="text-5xl font-serif text-[#d4a55a] leading-none mb-3 select-none" aria-hidden="true">&ldquo;</div>
                <p className="text-sm text-[#3a3a3a] leading-relaxed flex-1">{t.quote}</p>
                <div className="h-px bg-[#d4a55a]/30 my-5" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
                    <p className="text-xs text-[#7a7a7a] mt-0.5">{t.role}</p>
                    <p className="text-xs text-[#7a7a7a]">{t.location}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-[#c08b3e] bg-[#fdf5e6] px-2 py-1 rounded-md tracking-wide">{t.score}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Why I Do This from Montana — editorial split with Zone B photo */}
          <div className="mb-10 sm:mb-12 flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3 sm:mb-4">
                Why I Do This from Montana
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                I could live anywhere and do this job. I chose Whitefish because
                it fits the life I have always been trying to build: one where you
                are accountable to your own decisions, not someone else&apos;s
                calendar. My entire adult career has been self-employed. Every
                chapter has been my own business, my own risk, my own call.
              </p>
            </div>
            {/* Photo Zone B — trail overlook selfie */}
            <div className="w-full lg:w-64 lg:flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
              <Image
                src="/images/kelsey-trail-selfie.jpg"
                alt="Kelsey Stuart on a Montana trail overlook"
                width={800}
                height={280}
                sizes="(max-width: 1024px) 100vw, 256px"
                className="w-full object-cover"
                style={{ objectPosition: "center 70%", height: "280px" }}
              />
            </div>
          </div>

          {/* What I Am Not */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3 sm:mb-4">
              What I Am Not
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              I am not a corporate recruiting firm. I am not going to send you
              a slide deck full of logos and ask you to pick one. I am not going
              to pressure you into a timeline. I am one person who knows this
              industry inside and out, and I treat every conversation like I am
              talking to a friend who is thinking about making a big life change.
              Because that is exactly what this is.
            </p>
          </div>

          {/* CTA */}
          <div className="bg-[#0c1929] rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10">
            <h3 className="text-base sm:text-lg font-semibold text-[#d4a55a] mb-3">
              Want to have a real conversation?
            </h3>
            <p className="text-sm sm:text-base text-slate-400 mb-5 sm:mb-6">
              30 minutes. No agenda. Just an honest back-and-forth about
              where you are and what makes sense from here.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <a
                href="/book"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all press-effect min-h-[48px]"
              >
                Book a Free Call
              </a>
              <a
                href="/scorecard"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all press-effect min-h-[48px]"
              >
                Take the Readiness Quiz
              </a>
              <a
                href="sms:+12149951062"
                className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
              >
                Or text me &rarr;
              </a>
            </div>
            <p className="mt-5 text-xs text-white/40">
              Want to see how I work first?{" "}
              <a href="/process" className="text-white/60 underline hover:text-white/80 transition-colors">See the process &rarr;</a>
            </p>
          </div>

        </div>
      </section>
    </>
  );
}
