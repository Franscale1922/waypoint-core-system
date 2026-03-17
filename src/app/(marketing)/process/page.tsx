import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Work with Waypoint Franchise Advisors",
  description:
    "A five-step process from your first conversation to a confident franchise decision. Free consulting, no pitch.",
  totalTime: "P4W",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "The Intro Call",
      text: "A short call, usually 20 to 30 minutes. No pitch, no intake form. Kelsey wants to understand where you are in the process and whether it makes sense to go deeper. If it does, a two-hour discovery conversation is scheduled from there.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "The Model",
      text: "After the discovery call, Kelsey writes a four-paragraph summary reflecting what he heard: the role you want in a business, the financial profile that makes sense, the lifestyle you are protecting, and the red flags that would make a bad fit obvious. You review it and confirm it is accurate.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "The Curated List",
      text: "Kelsey presents three or four franchise concepts, never more. Each one has been pre-screened for financial disclosures, territory availability in your area, and unit-level performance across the system.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Validation Calls",
      text: "You speak directly with existing franchise owners, without the franchisor present. These conversations cover what a hard week looks like, where the brand falls short, and what owners wish they had known before signing.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "The Decision",
      text: "You are always in control. Kelsey navigates and advises, but every decision is yours. If franchising is not the right move, he will tell you. About 30% of candidates end up buying a franchise. That number is not optimized upward.",
    },
  ],
};

export const metadata: Metadata = {
  title: "How It Works | Waypoint Franchise Advisors",
  description:
    "Two hours before you see a single brand. Here is exactly what happens from your first conversation to the day you make a decision.",
  openGraph: {
    title: "How the Waypoint Process Works",
    description:
      "Two hours before you see a single brand. A step-by-step look at how Kelsey guides candidates from curious to confident.",
    url: "https://waypointfranchise.com/process",
    images: [{ url: "/og/og-process.png", width: 1200, height: 630, alt: "The Waypoint Process — No Pitch, No Hard Close" }],
  },
  alternates: { canonical: "https://waypointfranchise.com/process" },
};

const steps = [
  {
    number: "01",
    label: "The Intro Call",
    headline: "Thirty minutes to see if this makes sense.",
    outcome: "A clear picture of where you are and whether it makes sense to go deeper.",
    body: [
      "When I was on the franchisor side, I watched people get matched to brands that had nothing to do with their strengths, their lifestyle, or what they actually wanted to build. The match was fast. The regret was slow.",
      "The first thing we do is a short call, usually 20 to 30 minutes. No pitch, no intake form. I want to understand where you are in the process and whether it makes sense to go deeper. If it does, we schedule the two-hour discovery.",
      "I guide the conversation with a structured set of topics, but the goal is simple: I want to understand your strengths well enough to match them to a business model, not just a brand name.",
      "By the end of that call, I usually have a clear picture. You will too.",
    ],
  },
  {
    number: "02",
    label: "The Model",
    headline: "Your unemotional baseline, in writing.",
    outcome: "A written profile covering your capital range, working style, lifestyle requirements, and what would make the wrong franchise obvious from the start.",
    body: [
      "After every discovery call, I write what I call a model. It is roughly four paragraphs that reflect back what I heard: the role you want to play in a business, the financial profile that makes sense, the lifestyle you are protecting, and the things that would make the wrong franchise feel obvious in hindsight.",
      "I send it to you and ask you to tell me if I got it right. More often than not, I do. If something is off, we adjust.",
      "The reason this matters: franchise development teams are excellent salespeople. They can get you excited about something that does not fit. The model gives us both an unemotional reference point to come back to throughout the process.",
    ],
  },
  {
    number: "03",
    label: "The Curated List",
    headline: "Three or four brands. Never more.",
    outcome: "A shortlist of 3 to 4 brands built around your profile. Each one pre-screened on financials, territory availability, and how the system is performing.",
    body: [
      "I work with roughly 250 franchise concepts across dozens of industries. Before I present anything, I have already reviewed the financial disclosures, checked territory availability in your area, and screened how units are performing across the system.",
      "What I will not bring you is a brand that does not report its financials, a brand where locations are closing faster than they are opening, or a brand that has no available territory near you.",
      "What I look for are brands established enough to have real systems and real support, but that still have open territory with room to grow. Think proven infrastructure, strong franchisee satisfaction data, and financials you can actually read in the FDD. Not household names. Their best territories are long gone. The sweet spot is one level below that.",
      "I bring you three or four. Not twenty. Too many and you start making decisions based on marketing instead of fit.",
    ],
  },
  {
    number: "04",
    label: "Validation Calls",
    headline: "Talking to real owners, without the franchisor in the room.",
    outcome: "Direct conversations with owners who have no reason to sell you anything. You ask what a bad week looks like, where the brand falls short, and what they wish they had known before they signed.",
    body: [
      "After your first couple of conversations with each brand, they will invite you to a group call with existing owners. The franchisor is not on that call. Nobody is watching what gets said.",
      "This is where you ask the questions that actually matter. What does a bad week look like? What does the support actually do? What do you wish you had known before you signed? Where does the brand fall short?",
      "These conversations are, in my opinion, the most valuable part of the entire process. You are not hearing from the marketing team. You are hearing from people who are doing the thing, in real markets, with their own money on the line.",
    ],
  },
  {
    number: "05",
    label: "The Decision",
    headline: "You are always in control.",
    outcome: "A yes or no backed by complete data, a clear picture of the franchise agreement's terms, and a franchise attorney recommendation for independent legal review.",
    body: [
      "I use an analogy I made up on a call once and have never stopped using: I am the chauffeur. You own the car. You tell me where you want to go, and I drive and navigate and point out things worth noticing. But if you want to turn left, or slow down, or stop entirely, you tell me and we do that.",
      "At every step of this process, you are the one making decisions. My job is to make sure those decisions are informed ones.",
      "If franchising is not the right move, I will tell you that. About thirty percent of the candidates I talk with end up buying a franchise. I am not trying to move that number. I have the financial freedom to do this because I want to, not because I need a referral fee. A fit that is wrong for you is wrong for both of us.",
      "If it is the right move, you will feel it. The decision, when it comes, should feel more like excitement than fear.",
    ],
  },
];

export default function ProcessPage() {
  return (
    <main className="text-[#0c1929]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="relative min-h-[55vh] flex items-end pb-16 sm:pb-24 px-6 overflow-hidden"
      >
        <Image
          src="/images/process-hero-river-canyon.png"
          alt="Montana river canyon at twilight"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 35%" }}
        />
        {/* Primary overlay: bottom-to-top gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/10" />
        {/* Secondary scrim: left-side reinforcement so text area stays dark regardless of image content */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto w-full">

          <h1
            className="font-playfair text-4xl sm:text-6xl text-white leading-tight mb-4"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
          >
            Two hours before<br className="hidden sm:block" /> you see a single brand
          </h1>
          <p
            className="text-white/80 text-base sm:text-lg max-w-xl leading-relaxed mb-2"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
          >
            Before you see a single franchise brand, I want to understand you: your career, your goals, what you actually want from the next chapter.
          </p>
          <p
            className="text-[#d4a55a] text-sm sm:text-base max-w-xl leading-relaxed font-medium"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)" }}
          >
            Most consultants skip this part. That&apos;s why people end up in the wrong franchise.
          </p>
          <p
            className="text-[#d4a55a] text-sm sm:text-base max-w-xl leading-relaxed font-medium mt-2"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.9)" }}
          >
            Most candidates go from intro call to a clear decision in 6&ndash;10 weeks. The pace is always yours.
          </p>
        </div>
      </section>

      {/* ── Intro context bar ──────────────────────────── */}
      <section className="border-b border-[#e8e0d0] bg-[#f7f5f1]">
        <div className="max-w-4xl mx-auto px-6 py-10 sm:py-14 grid sm:grid-cols-3 gap-5 text-center">
          {[
            { stat: "250+", label: "Franchise concepts in our inventory" },
            { stat: "3–4", label: "Brands presented per candidate, maximum" },
            { stat: "~30%", label: "Of candidates end up buying a franchise. That is okay." },
          ].map(({ stat, label }) => (
            <div key={stat} className="bg-white border border-[#e2ddd2] rounded-lg py-5 px-4">
              <p className="text-2xl sm:text-3xl font-black text-[#1b3a5f] tracking-tight mb-2">{stat}</p>
              <p className="text-[10px] text-[#7a7a7a] uppercase tracking-widest leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ─────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-20 sm:py-28 space-y-24 sm:space-y-32">
        {steps.map((step, i) => (
          <>
            <div
              key={step.number}
              className={`flex flex-col ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"} gap-10 sm:gap-16 items-start`}
            >
              {/* Number + label */}
              <div className="flex-shrink-0 sm:w-40 text-center sm:text-right">
                <span className="block font-playfair text-6xl sm:text-7xl text-[#d4a55a]/30 leading-none">
                  {step.number}
                </span>
                <span className="block text-xs tracking-[0.18em] uppercase text-[#d4a55a] mt-2 font-medium">
                  {step.label}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <div className="w-12 h-[2px] bg-[#d4a55a] mb-6" />
                <h2 className="font-playfair text-2xl sm:text-3xl leading-snug mb-6">
                  {step.headline}
                </h2>
                <div className="space-y-4">
                  {step.body.map((para, j) => (
                    <p key={j} className="text-[#3a3a2e] leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
                {step.outcome && (
                  <div className="mt-6 flex gap-3 items-start bg-[#f7f5f1] border border-[#e2ddd2] rounded-lg px-4 py-3">
                    <span className="text-[#d4a55a] font-semibold text-xs uppercase tracking-widest whitespace-nowrap mt-0.5">Walk away with:</span>
                    <p className="text-sm text-[#3a3a2e] leading-relaxed">{step.outcome}</p>
                  </div>
                )}
              </div>
            </div>
            {/* Mid-page CTA — inserted after Step 04 (Validation Calls) */}
            {step.number === "04" && (
              <div className="bg-[#0c1929] rounded-xl p-8 sm:p-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a55a] mb-3">Sound like the right approach?</p>
                <h3 className="font-playfair text-2xl sm:text-3xl text-white mb-6 leading-snug">
                  Book a 30-minute intro call.
                </h3>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all min-h-[48px]"
                >
                  Book a Free Call
                </Link>
              </div>
            )}
          </>
        ))}
      </section>

      {/* Internal link to resources */}
      <div className="max-w-3xl mx-auto px-6 pb-8 text-center">
        <p className="text-[#5a5a4a] text-sm">
          Want to go deeper before the call?{" "}
          <a href="/resources" className="text-[#c08b3e] font-medium hover:text-[#d4a55a] transition-colors">
            Browse franchise resources →
          </a>
        </p>
      </div>

      {/* Process map image */}
      <div className="w-full overflow-hidden">
        <Image
          src="/images/kelsey-process-map.jpg"
          alt="Kelsey Stuart reviewing a topographic map at an outdoor table in Montana"
          width={1200}
          height={420}
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="w-full object-cover"
          style={{ objectPosition: 'center 45%', height: '420px' }}
        />
      </div>

      {/* ── Divider quote ─────────────────────────────── */}
      <section className="bg-[#0c1929] py-20 px-6 text-center">
        <p className="font-playfair text-2xl sm:text-3xl text-white max-w-2xl mx-auto leading-relaxed italic">
          &ldquo;The worst outcome is making a $300,000 decision on incomplete information.&rdquo;
        </p>
        <p className="text-[#d4a55a] text-sm mt-6 tracking-widest uppercase">
          The Waypoint philosophy
        </p>
      </section>

      {/* ── What you need to start ────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 sm:py-28">
        <p className="text-[#d4a55a] text-xs tracking-[0.2em] uppercase font-medium mb-4 text-center">
          Before We Talk
        </p>
        <h2 className="font-playfair text-3xl sm:text-4xl text-center mb-12">
          What you actually need to get started.
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            {
              title: "Liquid capital of $100K or more",
              body: "This is not a hard floor. At $75K you have options. At $100K or more, the options meaningfully expand. The right amount depends on the model we find. We will talk through what you have and what makes sense.",
            },
            {
              title: "A willingness to explore",
              body: "You do not need to know anything about franchising. Most candidates do not. You just need to be open to learning and honest about what you are looking for. I will handle the rest.",
            },
            {
              title: "A couple of hours for a real conversation",
              body: "The discovery call is not a 20-minute pitch. It is a real conversation that I guide through your background, your goals, and your life. Budget two hours and show up willing to talk openly.",
            },
            {
              title: "A sense of what you do not want",
              body: "You do not need to know what you want to own. It helps a lot to know what you do not want. Industries you would not enjoy, work styles that drain you, commitments you cannot make. That clarity shapes everything.",
            },
            {
              title: "Your partner doesn\'t need to be on the first call",
              body: "But if we start to get somewhere, I encourage you to bring them in. This is a household decision and I treat it that way. It is completely normal to start the conversation solo.",
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="bg-white border border-[#e8e0d0] rounded-lg p-6"
            >
              <div className="w-8 h-[2px] bg-[#d4a55a] mb-4" />
              <h3 className="font-playfair text-lg mb-3">{title}</h3>
              <p className="text-sm text-[#5a5a4a] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section
        className="relative py-24 px-6 text-center overflow-hidden"
      >
        <Image
          src="/images/mountain-lake.jpg"
          alt="Mountain lake in Montana"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#0c1929]/50" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-[#d4a55a] text-xs tracking-[0.2em] uppercase font-medium mb-4">
            Ready to Start
          </p>
          <h2 className="font-playfair text-3xl sm:text-5xl text-white mb-6">
            The first conversation costs you nothing
          </h2>
          <p className="text-white/75 text-lg mb-10">
            No pitch. No obligation. Just a real conversation about whether this path makes sense for you.
          </p>
          <div className="flex flex-col gap-4 justify-center items-center">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#c49848] rounded-lg transition-all min-h-[48px]"
              >
                Book a Free Call
              </Link>
              <Link
                href="/scorecard"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold tracking-wide text-white border border-white/40 hover:bg-white/10 rounded-lg transition-all min-h-[48px]"
              >
                Take the Readiness Quiz
              </Link>
            </div>
            <a
              href="sms:+12149951062"
              className="inline-flex items-center justify-center text-sm font-medium text-white/60 hover:text-white transition-colors min-h-[48px] px-2"
            >
              Or text me &rarr;
            </a>
          </div>

        </div>
      </section>

    </main>
  );
}
