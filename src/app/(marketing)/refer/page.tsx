import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Refer a Friend | Waypoint Franchise Advisors",
  description:
    "Know someone who's been quietly thinking about franchise ownership? Here's a simple way to point them in the right direction.",
  alternates: { canonical: "https://www.waypointfranchise.com/refer" },
  openGraph: {
    title: "Refer a Friend | Waypoint Franchise Advisors",
    description:
      "If you know someone who's been thinking about owning a business, here's an easy way to send them to Kelsey.",
    url: "https://www.waypointfranchise.com/refer",
    images: [
      {
        url: "https://www.waypointfranchise.com/images/refer-hero-overlook.jpg",
        width: 1200,
        height: 800,
        alt: "Refer a friend to Waypoint Franchise Advisors",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Refer a Friend | Waypoint Franchise Advisors",
    description:
      "Know someone who's been quietly thinking about franchise ownership? Here's a simple way to point them in the right direction.",
    images: ["https://www.waypointfranchise.com/images/refer-hero-overlook.jpg"],
  },
};

const personas = [
  {
    title: "The Burned-Out Achiever",
    text: "Someone who's been successful in corporate but is done building someone else's dream.",
  },
  {
    title: "The Corporate Expat",
    text: "Someone who was laid off, or saw the reorg coming and got out. Now figuring out what's next.",
  },
  {
    title: "The Trailing Spouse",
    text: "Smart, capable, relocated again. Wants something portable and theirs.",
  },
  {
    title: "The 3–5 Year Planner",
    text: "Still employed, doing well, but quietly researching the exit before they need one.",
  },
  {
    title: "The Off-Ramp Builder",
    text: "Not quitting tomorrow, but wants to start building something on the side so the money is already flowing when they do.",
  },
];

const emailSubject = encodeURIComponent("Someone I thought you should know about");
const emailBody = encodeURIComponent(
  `Hi Kelsey,\n\nI wanted to introduce you to [Name]. They've been thinking about franchise ownership and I think a conversation with you would be worthwhile for them.\n\n[Name]\n[Phone or email]\n\nFeel free to reach out.`
);

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.waypointfranchise.com/refer",
      "name": "Refer a Friend | Waypoint Franchise Advisors",
      "description": "Know someone who's been quietly thinking about franchise ownership? Here's a simple way to point them in the right direction.",
      "url": "https://www.waypointfranchise.com/refer",
      "publisher": {
        "@type": "LocalBusiness",
        "name": "Waypoint Franchise Advisors",
        "url": "https://www.waypointfranchise.com"
      }
    },
    {
      "@type": "HowTo",
      "name": "How to Refer Someone to Waypoint Franchise Advisors",
      "description": "Three simple ways to send a friend or colleague to speak with Kelsey Stuart about franchise ownership — no formal process required.",
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "Mention that you know Kelsey",
          "text": "A quick text or email letting them know works perfectly. No formal intro needed."
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "Send them to this site",
          "text": "They can read about the process, take the readiness quiz, or just reach out directly at waypointfranchise.com/refer."
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "Or send Kelsey a direct intro",
          "text": "Email kelsey@waypointfranchise.com with the person's name and contact info. There's no right way to do this."
        }
      ]
    }
  ]
};

export default function ReferPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="relative pt-16 pb-36 sm:py-24 md:py-32 overflow-hidden">
        <Image
          src="/images/refer-hero-overlook.jpg"
          alt="Person pointing toward a sweeping mountain valley at dusk"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Gradient: heavy on left for text readability, fades right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1929]/80 via-[#0c1929]/50 to-transparent" />
        {/* Bottom fade for mobile readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1929]/60 via-transparent to-transparent" />
        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-5">
              Refer a Friend
            </p>
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl text-white leading-tight">
              Referrals mean the world to me
              <span className="block">And your friends</span>
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-white/75 leading-relaxed">
              Point them this way. That&apos;s really all it takes.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-14 sm:py-20 bg-[#FAF8F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* The honest note */}
          <div className="mb-12 sm:mb-16 flex gap-5 sm:gap-6 items-start">
            <div className="flex-shrink-0 w-1 sm:w-[3px] rounded-full bg-[#CC6535] self-stretch" />
            <div>
              <p className="font-playfair text-xl sm:text-2xl italic text-[#1a1a1a] leading-snug mb-3">
                &ldquo;Most of my best conversations have started with an introduction from someone who&apos;d been through it themselves.&rdquo;
              </p>
              <p className="text-sm text-[#7a7a7a]">Kelsey Stuart, Waypoint Franchise Advisors</p>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-6">
              How to send someone my way
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  step: "01",
                  title: "Mention that you know Kelsey",
                  body: "A quick text or email letting them know works perfectly. No formal intro needed.",
                },
                {
                  step: "02",
                  title: "Send them to this site",
                  body: "They can read about the process, take the readiness quiz, or just reach out directly.",
                },
                {
                  step: "03",
                  title: "Or send Kelsey an intro",
                  body: "If you want to make a direct introduction, an email or text works fine. There's no right way to do this.",
                },
              ].map(({ step, title, body }) => (
                <div key={step} className="bg-white border border-[#e2ddd2] rounded-xl p-6">
                  <span className="block font-playfair text-4xl text-[#CC6535]/25 leading-none mb-3">
                    {step}
                  </span>
                  <div className="w-8 h-[2px] bg-[#CC6535] mb-4" />
                  <h3 className="font-semibold text-[#1a1a1a] mb-2">{title}</h3>
                  <p className="text-sm text-[#5a5a4a] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Who fits */}
          <div className="mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3">
              Who tends to get the most out of a conversation
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              You don&apos;t need to have it all figured out before reaching out. But if any of these sound like someone you know, it&apos;s probably worth a conversation.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {personas.map(({ title, text }) => (
                <div key={title} className="flex gap-4 items-start bg-white border border-[#e2ddd2] rounded-xl p-5">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#CC6535] mt-2" />
                  <div>
                    <p className="font-semibold text-sm text-[#1a1a1a] mb-1">{title}</p>
                    <p className="text-sm text-[#5a5a4a] leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The honest note */}
          <div className="mb-12 sm:mb-16 bg-[#0c1929] rounded-xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-[#CC6535] mb-3">
              A quick note on why I&apos;m asking
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-4">
              More of my referrals come from people who decided not to buy a franchise than from people who did. That says something about how the process works.
            </p>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              When someone goes through it and realizes it&apos;s not the right fit, they don&apos;t walk away feeling sold to. They walk away with more clarity than they started with. And they tend to think of someone they know who&apos;d benefit from that same kind of honest conversation. If you know someone at that kind of crossroads, that&apos;s exactly who I&apos;m here for.
            </p>
          </div>

          {/* CTA */}
          <div className="bg-[#f7f5f1] border border-[#e2ddd2] rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-[#1b3a5f] mb-3">
              Ready to make an intro?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              The easiest way is a quick email. Here&apos;s a template you can use — just fill in their name and contact info.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <a
                href={`mailto:kelsey@waypointfranchise.com?subject=${emailSubject}&body=${emailBody}`}
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#0c1929] bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all press-effect min-h-[48px]"
              >
                Email Kelsey an intro
              </a>
              <a
                href="sms:+12149951062"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#1b3a5f] border border-[#1b3a5f]/30 hover:border-[#CC6535] hover:text-[#CC6535] rounded-lg transition-all press-effect min-h-[48px]"
              >
                Or text Kelsey directly
              </a>
            </div>
            <p className="mt-5 text-sm text-[#7a7a7a]">
              Or just share this page:{" "}
              <span className="text-[#1b3a5f] font-medium">waypointfranchise.com/refer</span>
            </p>
          </div>

          {/* Closing */}
          <div className="mt-10 sm:mt-12 text-center">
            <p className="text-sm text-[#7a7a7a]">
              Want to explore franchise ownership yourself?{" "}
              <Link href="/scorecard" className="text-[#8E3012] hover:text-[#CC6535] transition-colors font-medium">
                Take the free readiness quiz →
              </Link>
            </p>
          </div>

        </div>
      </section>
    </>
  );
}
