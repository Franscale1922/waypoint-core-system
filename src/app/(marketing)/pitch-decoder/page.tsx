import type { Metadata } from "next";
import Link from "next/link";
import PitchDecoderCaptureForm from "../../components/PitchDecoderCaptureForm";
import JsonLd from "../../components/JsonLd";

export const metadata: Metadata = {
  title: "The Franchise Pitch Decoder",
  description:
    "A free reference for hearing what a franchise pitch is really saying, plus the one question that tends to surface the truth. Works on any business someone is selling you.",
  openGraph: {
    title: "The Franchise Pitch Decoder | Waypoint Franchise Advisors",
    description:
      "Free download: hear what a franchise pitch is really saying, and the one question that gets the truth. Works on any business someone is selling you.",
    url: "https://www.waypointfranchise.com/pitch-decoder",
  },
  alternates: { canonical: "https://www.waypointfranchise.com/pitch-decoder" },
};

const pitchDecoderSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://www.waypointfranchise.com/pitch-decoder#webpage",
      url: "https://www.waypointfranchise.com/pitch-decoder",
      name: "The Franchise Pitch Decoder | Waypoint Franchise Advisors",
      description:
        "A free reference for hearing what a franchise pitch is really saying, plus the one question that surfaces the truth.",
      inLanguage: "en-US",
      isPartOf: { "@id": "https://www.waypointfranchise.com/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.waypointfranchise.com" },
        { "@type": "ListItem", position: 2, name: "The Franchise Pitch Decoder", item: "https://www.waypointfranchise.com/pitch-decoder" },
      ],
    },
  ],
};

const SECTIONS = [
  {
    number: "01",
    title: "What a Pitch Is Built To Do",
    desc: "Every pitch is designed to move you toward a yes. Here is how to listen for the parts that are doing the moving.",
  },
  {
    number: "02",
    title: "What Gets Said, What Gets Skipped",
    desc: "The gap between the slides and the silence is where the real information lives. A short list of what to notice.",
  },
  {
    number: "03",
    title: "The One Question",
    desc: "A single question you can ask in any pitch that tends to surface what the rest of the conversation was working around.",
  },
  {
    number: "04",
    title: "How To Use the Answer",
    desc: "What a clear answer tells you, what a vague one tells you, and how to keep your footing either way.",
  },
];

export default function PitchDecoderPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <JsonLd data={pitchDecoderSchema} />

      {/* ── Hero ── */}
      <section className="bg-[#0c1929] pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CC6535] mb-4">
            The Franchise Pitch Decoder: Free Download
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-white mb-5 leading-tight">
            Hear what a franchise pitch<br className="hidden sm:block" /> is really saying
          </h1>
          <p className="text-white/65 text-lg max-w-2xl leading-relaxed">
            A short reference for listening to a pitch and noticing what is being said, what is being
            skipped, and the one question that gets you the truth. It works on any business someone is
            selling you, not just franchises.
          </p>
        </div>
      </section>

      {/* ── What's inside ── */}
      <section className="max-w-5xl mx-auto px-5 sm:px-10 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-8">
          What&rsquo;s Inside
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECTIONS.map((s) => (
            <div
              key={s.number}
              className="bg-white border border-[#e2ddd2] rounded-xl p-6 flex flex-col gap-3"
            >
              <span className="text-xs font-bold tracking-widest text-[#CC6535]">{s.number}</span>
              <h2 className="font-playfair text-base text-[#0c1929] leading-snug">{s.title}</h2>
              <p className="text-sm text-[#5a5a4a] leading-relaxed">{s.desc}</p>
            </div>
          ))}
          {/* Closing tile */}
          <div className="bg-[#0c1929] rounded-xl p-6 flex flex-col gap-3 justify-center">
            <p className="text-sm text-white/70 leading-relaxed">
              A one-page PDF, sent to your inbox in minutes. No pitch inside. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── Capture form ── */}
      <section className="max-w-2xl mx-auto px-5 sm:px-10 pb-20">
        <div className="bg-[#0c1929]/5 border border-[#e2ddd2] rounded-xl px-6 py-5 mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#CC6535]/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC6535" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
          <p className="text-sm text-[#3a3a3a] leading-relaxed">
            Waypoint advises professionals exploring franchise ownership. The advisory is
            <strong> free to candidates</strong>. Kelsey is compensated by franchise brands only after a
            match is made, and only when he believes it&rsquo;s the right fit.
          </p>
        </div>

        <div className="bg-white border border-[#e2ddd2] rounded-2xl p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E3012] mb-3">
            Get the Download
          </p>
          <h2 className="font-playfair text-2xl sm:text-3xl text-[#0c1929] mb-2 leading-snug">
            Send me the Pitch Decoder
          </h2>
          <p className="text-sm text-[#5a5a4a] mb-8 leading-relaxed">
            Enter your name and email. The PDF arrives in your inbox within a few minutes.
            No pitch inside. No obligation attached.
          </p>
          <PitchDecoderCaptureForm />
          <p className="mt-5 text-xs text-[#9a9a8a] leading-relaxed">
            By submitting, you&rsquo;ll receive the download and a short follow-up sequence.
            You can unsubscribe from any email with one click.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-[#e2ddd2] py-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-[#5a5a4a] leading-relaxed max-w-xl mx-auto mb-6">
            Not ready to download yet? The Readiness Scorecard takes four minutes and gives you a
            score that tells you something concrete about where you stand before any conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/scorecard"
              className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold tracking-wide text-white bg-[#CC6535] hover:bg-[#D4724A] rounded-lg transition-all min-h-[44px]"
            >
              Take the Readiness Scorecard
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold tracking-wide text-[#0c1929] border border-[#0c1929]/20 hover:bg-[#0c1929]/5 rounded-lg transition-all min-h-[44px]"
            >
              Book a Free Call
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
