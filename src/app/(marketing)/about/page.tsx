import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Kelsey Stuart — Franchise Advisor, Whitefish MT",
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
      <section className="relative py-16 sm:py-20 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/fly-fishing.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1929]/90 via-[#0c1929]/70 to-[#0c1929]/50" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-sm font-semibold text-[#d4a55a] uppercase tracking-[0.2em] mb-3 sm:mb-4">
            About
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            I am Kelsey Stuart.
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
            Franchise consultant, former Bloomin&apos; Blinds franchisor, and the
            guy who will be completely honest with you about whether franchise
            ownership is actually the right move for your life.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 sm:py-20 bg-[#FAF8F4]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3 sm:mb-4">
              The Short Version
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              I live in Whitefish, Montana. I fish, I ski, and I hang out at
              the local tap house after a day on the mountain. I got into
              franchising when I helped take a family business and turn it into
              a real competitor. Then we franchised it as Bloomin&apos; Blinds
              and grew it to a $40M system with over 200 locations. After that
              I went the other direction and became a franchisee. Honestly, I
              was terrible at it. We made a lot of mistakes and we lost money.
              That failure taught me more about what makes a franchise work for
              real people than anything I learned on the franchisor side.
            </p>
          </div>

          <div>
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

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b3a5f] mb-3 sm:mb-4">
              Why I Do This from Montana
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              I could live anywhere and do this job. I chose Whitefish because
              it reminds me every single day why I left corporate. The mountains,
              the rivers, the slower pace. Most of my clients are in the middle
              of that same realization: life is too short to spend it building
              someone else&apos;s thing. I get it because I have been there.
            </p>
          </div>

          <div>
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

          <div className="bg-[#0c1929] rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10">
            <h3 className="text-base sm:text-lg font-semibold text-[#d4a55a] mb-3">
              Want to have a real conversation?
            </h3>
            <p className="text-sm sm:text-base text-slate-400 mb-5 sm:mb-6">
              30 minutes. No agenda. Just an honest back-and-forth about
              where you are and what makes sense from here.
            </p>
            <a
              href="/book"
              className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all press-effect min-h-[48px]"
            >
              Book a Free Call
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
