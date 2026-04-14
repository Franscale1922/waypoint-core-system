import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Testimonials from "../components/Testimonials";
import FranchiseMapWrapper from "../components/FranchiseMapWrapper";

export const metadata: Metadata = {
  title: "Find the Franchise That Fits Your Life | Waypoint Franchise Advisors",
  description:
    "Free franchise consulting from Kelsey Stuart, former Bloomin' Blinds franchisor. I've helped 146+ owners across 35 states find the right franchise. No pitch, no pressure.",
  alternates: { canonical: "https://www.waypointfranchise.com" },
  openGraph: {
    title: "Find the Franchise That Fits Your Life | Waypoint Franchise Advisors",
    description:
      "Free franchise consulting. 146+ owners helped across 35 states. Former franchisor. Book a free 30-min discovery call from Whitefish, Montana.",
    url: "https://waypointfranchise.com",
    images: [{ url: "/og_default_1773343895292.png", width: 1200, height: 630, alt: "Waypoint Franchise Advisors — Find the Franchise That Fits Your Life" }],
  },
};

export default function HomePage() {
  const personas = [
    {
      title: "The Burned-Out Achiever",
      text: "You crushed it in corporate. VP, Director, maybe C-suite. You hit every number. And one morning you realized you were building someone else's dream. You want ownership, not another title.",
    },
    {
      title: "The Corporate Expat",
      text: "You got laid off. Or you saw the writing on the wall and walked. Either way, you're done waiting for the next reorg to decide your future.",
    },
    {
      title: "The Trailing Spouse",
      text: "Your partner's career moved your family again. You're smart, capable, and tired of restarting from zero every three years. You want something portable that's yours.",
    },
    {
      title: "The 3–5 Year Planner",
      text: "You're not in a rush. Still employed, still earning. But you're quietly researching what comes next. You want to understand your options before you need them.",
    },
    {
      title: "The Off-Ramp Builder",
      text: "You're not quitting tomorrow. You like the paycheck and you're not ready to walk away from it yet. But you want to start building something on the side so that when you do leave, the money is already flowing.",
    },
  ];

  return (
    <>
      {/* ============================================
          HERO — Full-screen Montana, text overlaid
          Inspired by: Eleven Experience, Under Canvas
          ============================================ */}
      <section className="relative min-h-[80vh] sm:min-h-screen flex items-center sm:items-end overflow-hidden">
        <Image
          src="/images/hero-mountains-dark-lake.webp"
          alt="Dark mountain lake at twilight with alpenglow peaks — Waypoint Franchise Advisors, Whitefish Montana"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1929]/75 via-[#0c1929]/25 to-transparent" />

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 md:pb-28">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight max-w-3xl animate-fade-in-up stagger-1">
            Find the franchise that fits your life
            <br />
            <span className="text-[#CC6535] [text-shadow:0_2px_12px_rgba(0,0,0,0.85),0_1px_4px_rgba(0,0,0,0.9)] sm:[text-shadow:none]">Not the other way around</span>
          </h1>
          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-white/70 leading-relaxed max-w-xl animate-fade-in-up stagger-2">
            I&apos;m Kelsey Stuart. Former franchise owner. I help burned-out
            professionals figure out if franchise ownership actually makes
            sense. It costs you absolutely nothing.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 animate-fade-in-up stagger-3">
            <Link
              href="/book"
              id="hero-cta-book"
              className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D97545] rounded-lg transition-all press-effect min-h-[48px]"
            >
              Book a Free Call
            </Link>
            <Link
              href="/scorecard"
              id="hero-cta-quiz"
              className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] border border-[#0c1929] bg-white/10 hover:bg-white/20 text-white border-white/50 hover:border-white rounded-lg transition-all press-effect min-h-[48px]"
            >
              Take the Readiness Quiz
            </Link>
            <a
              href="sms:+12149951062"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors min-h-[48px] px-2"
            >
              Or text me &rarr;
            </a>
          </div>

          {/* B-3: 70% stat — safety/permission signal, not a proof credential */}
          <p className="mt-5 sm:mt-7 animate-fade-in-up stagger-4 text-[11px] sm:text-xs leading-snug">
            <span className="text-[#CC6535] font-medium">7 in 10 people I work with don&apos;t buy a franchise.</span>
            <br />
            <span className="text-white/50 whitespace-nowrap">That&apos;s not a failure. That&apos;s the point.</span>
          </p>

        </div>
      </section>


      {/* ============================================
          ZERO COST BAR — thin, quiet
          Inspired by: Mollie Aspen hairlines
          ============================================ */}
      <section className="py-4 sm:py-5 border-b border-[#e2ddd2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[11px] sm:text-xs md:text-sm text-[#555555] tracking-wide leading-relaxed">
            <span className="text-[#8E3012] font-medium">100% free to you.</span>{" "}
            Franchise brands pay the referral fee when you purchase.
            My only incentive is getting the match right.
          </p>
        </div>
      </section>
      {/* ============================================
          ENTITY BLOCK — AEO answer extraction target
          Crawlable, factual, standalone. Not a hero.
          ============================================ */}
      <section className="py-10 sm:py-12 border-b border-[#e2ddd2] bg-[#f7f5f1]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-5">
            About Waypoint
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { stat: "$40M+", label: "Franchise system built" },
              { stat: "200+", label: "Locations as franchisor" },
              { stat: "250+", label: "Concepts in inventory" },
              { stat: "$0", label: "Cost to candidates" },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-white border border-[#e2ddd2] rounded-lg py-4 px-3">
                <p className="text-xl sm:text-2xl font-black text-[#1b3a5f]">{stat}</p>
                <p className="mt-1 text-[10px] text-[#555555] uppercase tracking-widest leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          THE REAL TALK — Bold, direct, "not your typical consultant"
          ============================================ */}
      <section className="py-16 sm:py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E3012] mb-4 sm:mb-6">
              Let&apos;s be honest
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-[#1a1a1a] leading-[1.15] tracking-tight">
              Most franchise consultants hand you a catalog and hope for
              the best. That&apos;s a&nbsp;
              <span className="text-[#8E3012]">crappy</span> way to make a
              life-changing decision.
            </h2>
            <hr className="hairline mt-8 mb-8 sm:mt-12 sm:mb-12" />
            {/* Honest portrait — full width between headline and body text */}
            <div className="w-full overflow-hidden rounded-xl mb-8 sm:mb-12">
              <Image
                src="/images/kelsey-honest-portrait.webp"
                alt="Kelsey Stuart, franchise advisor"
                width={1200}
                height={380}
                sizes="(max-width: 768px) 100vw, 896px"
                className="w-full object-cover aspect-[3/2] h-auto sm:aspect-auto sm:h-[380px]"
                style={{ objectPosition: "center 25%" }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
              <div>
                <p className="text-sm sm:text-base text-[#4a4a4a] leading-relaxed">
                  I&apos;m not going to show you 200 brands and let you guess
                  which one fits. I&apos;m going to ask you real questions,
                  listen to the answers, and tell you what I actually think,
                  even if that means saying &ldquo;this isn&apos;t the right
                  time for you.&rdquo;
                </p>
              </div>
              <div>
                <p className="text-sm sm:text-base text-[#4a4a4a] leading-relaxed">
                  I helped build a family business into a real competitor, then
                  we franchised it as Bloomin&apos; Blinds and grew it to $40M
                  and over 200 locations. Then I became a franchisee myself.
                  I was terrible at it. I made a lot of mistakes and I lost
                  money. That is the experience I bring to this.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          WHO THIS IS FOR — Persona cards
          Asymmetric grid, editorial feel
          ============================================ */}
      <section className="py-16 sm:py-24 md:py-32 bg-[#0c1929]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#CC6535] mb-4 sm:mb-6">
              Sound familiar?
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight max-w-2xl">
              If any of this hits home, let&apos;s talk.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px mt-10 sm:mt-16 bg-[#1b3a5f]/30 rounded-xl sm:rounded-2xl overflow-hidden">
            {personas.map((persona, i) => (
              <div
                key={persona.title}
                className={`reveal p-6 sm:p-10 md:p-12 bg-[#0f2035] hover:bg-[#122a45] transition-colors duration-500 ${
                  i === personas.length - 1 && personas.length % 2 !== 0
                    ? "md:col-span-2"
                    : ""
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={i === personas.length - 1 && personas.length % 2 !== 0 ? "max-w-2xl mx-auto text-center" : ""}>
                  <h3 className="text-base sm:text-lg font-semibold text-[#CC6535] mb-3 sm:mb-4">
                    {persona.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {persona.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal mt-8 sm:mt-12 text-center flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D97545] rounded-lg transition-all press-effect min-h-[48px]"
            >
              Book a Free Call
            </Link>
            <Link
              href="/scorecard"
              className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold tracking-wide text-white border border-white/30 hover:bg-white/10 rounded-lg transition-all press-effect min-h-[48px]"
            >
              Take the Readiness Quiz
            </Link>
            <a
              href="sms:+12149951062"
              className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
            >
              Or text me &rarr;
            </a>
          </div>
          <div className="reveal mt-4 text-center">
            <Link
              href="/refer"
              className="text-xs text-white/35 hover:text-white/60 transition-colors tracking-wide"
            >
              Know someone this fits? Send them here &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          HOW THIS WORKS — editorial layout
          Staggered, not a boring 3-column grid
          ============================================ */}
      <section className="py-16 sm:py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="reveal text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E3012] mb-4 sm:mb-6">
              The Process
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight">
              No pitch deck. No hard close.
            </h2>
          </div>
          <hr className="hairline mt-8 mb-8 sm:mt-12 sm:mb-12" />
          {/* Process hero image — full width */}
          <div className="reveal w-full overflow-hidden rounded-xl mb-12 sm:mb-20">
            <Image
              src="/images/kelsey-process-conversation.webp"
              alt="Kelsey Stuart leading the way down a forest trail"
              width={1200}
              height={380}
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="w-full h-auto"
            />
          </div>

          <div className="space-y-10 sm:space-y-16 md:space-y-0 md:grid md:grid-cols-12 md:gap-8">
            {/* Step 1 */}
            <div className="reveal md:col-span-4 md:mt-0">
              <div className="border-t border-[#8E3012]/30 pt-6 sm:pt-8">
                <span className="text-xs font-semibold text-[#8E3012] tracking-widest">01</span>
                <h3 className="text-lg sm:text-xl font-bold text-[#1a1a1a] mt-3 mb-3 sm:mb-4">We Talk</h3>
                <p className="text-sm text-[#4a4a4a] leading-relaxed">
                  A straight conversation about your background, your capital,
                  what you want your day-to-day to actually look like, and what
                  scares you about all of it. No script. No intake form.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="reveal md:col-span-4 md:mt-16">
              <div className="border-t border-[#8E3012]/30 pt-6 sm:pt-8">
                <span className="text-xs font-semibold text-[#8E3012] tracking-widest">02</span>
                <h3 className="text-lg sm:text-xl font-bold text-[#1a1a1a] mt-3 mb-3 sm:mb-4">I Match</h3>
                <p className="text-sm text-[#4a4a4a] leading-relaxed">
                  Based on everything you tell me, I curate 3–4 franchise
                  concepts that fit. Not hundreds. A short list of validated
                  businesses that align with your money, skills, and life goals.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="reveal md:col-span-4 md:mt-32">
              <div className="border-t border-[#8E3012]/30 pt-6 sm:pt-8">
                <span className="text-xs font-semibold text-[#8E3012] tracking-widest">03</span>
                <h3 className="text-lg sm:text-xl font-bold text-[#1a1a1a] mt-3 mb-3 sm:mb-4">You Decide</h3>
                <p className="text-sm text-[#4a4a4a] leading-relaxed">
                  You talk to real franchise owners. You review the agreement.
                  You run the numbers yourself. I walk you through every
                  step, but you make the call. Always.
                </p>
              </div>
            </div>
          </div>
          <div className="reveal mt-10 sm:mt-14 text-center">
            <Link
              href="/process"
              className="inline-flex items-center text-sm text-[#8E3012] font-medium hover:text-[#CC6535] transition-colors tracking-wide"
            >
              See exactly how this works →
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          TESTIMONIALS — social proof after process steps
          ============================================ */}
      <Testimonials />

      {/* ============================================
          WHY ME — photo-forward, asymmetric
          The fly fishing image IS the section
          ============================================ */}
      <section className="relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0 lg:min-h-[600px]">
          {/* Photo side */}
          <div className="relative min-h-[325px] sm:min-h-[350px] lg:min-h-full overflow-hidden">
            <Image
              src="/images/kelsey-fly-fishing-river.jpg"
              alt="Kelsey Stuart fly fishing on a Montana river"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              style={{ objectPosition: "center 30%" }}
            />
          </div>
          {/* Text side */}
          <div className="bg-[#0c1929] px-5 sm:px-8 md:px-16 py-12 sm:py-16 md:py-24 flex items-center">
            <div className="reveal max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#CC6535] mb-4 sm:mb-6">
                About Kelsey
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight mb-6 sm:mb-8">
                I&apos;m not going to read you a damn brochure.
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-5 sm:mb-6">
                I know what it feels like to bet on yourself and come up short.
                I have been on both sides of franchising. I helped build a
                national brand, and I also failed as a franchise owner. That
                combination is why I can look you in the eye and tell you what
                is actually worth your time and money.
              </p>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-6 sm:mb-8">
                I do not get paid unless you find the right fit and move
                forward. So I have zero reason to push you toward something
                that does not work. If it is not a good match, I will say so.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center text-sm text-[#CC6535] font-medium hover:text-[#D4724A] transition-colors tracking-wide min-h-[44px]"
              >
                Read My Full Story
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center text-sm text-white/50 hover:text-white/80 transition-colors tracking-wide min-h-[44px] mt-3"
              >
                Common questions →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FRANCHISE MAP — dynamic pins from Google Sheet
          ============================================ */}
      <FranchiseMapWrapper />

      {/* ============================================
          ESCAPE KIT — Free guide CTA
          Cream strip, breaks rhythm before final CTA
          ============================================ */}
      <section className="py-16 sm:py-20 bg-[#f2ede3] border-t border-b border-[#e2ddd2]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="reveal flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-3">
                Free Guide
              </p>
              <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl text-[#0c1929] leading-tight mb-4">
                The Financial Safety Nets<br className="hidden sm:block" /> of Franchising vs. W2
              </h2>
              <p className="text-sm sm:text-base text-[#5a5a4a] leading-relaxed max-w-xl mx-auto lg:mx-0">
                Five sections on what franchise ownership actually costs, how SBA financing works,
                and the severance calculation most corporate professionals have never done.
                No email wall. Download free.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 items-center">
              <Link
                href="/escape-kit"
                id="homepage-escape-kit-cta"
                className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold tracking-wide text-white bg-[#0c1929] hover:bg-[#122640] rounded-lg transition-all press-effect min-h-[48px] whitespace-nowrap"
              >
                Get the Corporate Escape Kit
              </Link>
              <p className="text-xs text-[#9a9a8a] text-center">
                Delivered to your inbox in minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          FINAL CTA — mountain lake background
          Inspired by: Under Canvas location pages
          ============================================ */}
      <section className="relative py-20 sm:py-28 md:py-36 overflow-hidden">
        <Image
          src="/images/mountain-lake-wide.webp"
          alt="Mountain lake in Montana"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#0c1929]/40" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="reveal">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Not sure if this is right for you?
              <br />
              <span className="text-[#CC6535]">Good. Let&apos;s find out.</span>
            </h2>
            <p className="mt-5 sm:mt-6 text-sm sm:text-base text-white/60 leading-relaxed max-w-xl mx-auto">
              The 2-minute Readiness Quiz gives you a real score and an honest
              picture of where you stand. No email required until you want your
              results.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                href="/book"
                id="cta-bottom-book"
                className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all press-effect min-h-[48px]"
              >
                Book a Free Call
              </Link>
              <Link
                href="/scorecard"
                id="cta-bottom-quiz"
                className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all press-effect min-h-[48px]"
              >
                Take the Readiness Quiz
              </Link>
              <a
                href="sms:+12149951062"
                id="cta-bottom-sms"
                className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
              >
                Or text me &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
