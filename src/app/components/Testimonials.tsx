// Server Component — fetches live stats from Google Sheet, no "use client"
import TestimonialsCarousel, { type Testimonial } from "./TestimonialsCarousel";

const testimonials: Testimonial[] = [
  {
    quote:
      "I came in excited about two different concepts. Kelsey helped me walk through the real numbers and the day-to-day reality of each one. Honestly I still had doubts walking out of the first call — but by the second conversation something clicked. The one I chose has been a great fit.",
    name: "Marcus T.",
    role: "Former Regional Director, now franchise owner",
    location: "Denver, CO",
    score: "Readiness Score: 78",
  },
  {
    quote:
      "I thought I wanted a food concept. Ten minutes into the call Kelsey basically talked me out of it — not in a pushy way, just walked me through what the hours actually look like. Ended up with a service brand I'd never heard of. Two years in, it works.",
    name: "Jennifer R.",
    role: "Corporate expat, franchise owner since 2023",
    location: "Austin, TX",
    score: "Readiness Score: 84",
  },
  {
    quote:
      "Most consultants send you a list and disappear. Kelsey stayed involved through the whole thing. There were a few moments where I wasn't sure we'd get it across the finish line — he was the one who kept it moving.",
    name: "David K.",
    role: "Trailing spouse, now owner of two units",
    location: "Nashville, TN",
    score: "Readiness Score: 71",
  },
  {
    quote:
      "Kelsey told me not to buy. He told me my situation wasn't right for the concept I wanted and walked me through why. Six months later I was ready, and we found something that actually fit. That conversation saved me from a bad decision.",
    name: "Carol M.",
    role: "Former healthcare executive, franchise owner since 2025",
    location: "Phoenix, AZ",
    score: "Readiness Score: 62",
  },
  {
    quote:
      "I just wanted to understand my options. I was not in a hurry and I told him that upfront. He never pushed. We built a plan so that by the time I leave corporate, the business will already be running.",
    name: "James P.",
    role: "Still employed, franchise opens Q3 2026",
    location: "Chicago, IL",
    score: "Readiness Score: 73",
  },
  {
    quote:
      "My husband figured it was a sales call. He sat down to be polite. Ten minutes in he was the one asking questions. Once Kelsey explained how he gets paid, my husband was the one pushing us to move forward.",
    name: "Rachel S.",
    role: "Teacher turned franchise co-owner",
    location: "Raleigh, NC",
    score: "Readiness Score: 69",
  },
  {
    quote:
      "I showed up with a list of brands I'd already spent weeks researching. Kelsey set the list aside and asked me about my week. An hour later I was looking at something I'd never considered. Six months after that call I opened my doors.",
    name: "Tom W.",
    role: "Former tech executive, franchise owner",
    location: "Seattle, WA",
    score: "Readiness Score: 81",
  },
  {
    quote:
      "I was clear from the start: I could not be on-site sixty hours a week. He never brought me anything that didn't fit that. It sounds simple but it's actually rare.",
    name: "Lisa H.",
    role: "Trailing spouse, semi-absentee owner",
    location: "Scottsdale, AZ",
    score: "Readiness Score: 76",
  },
];

async function getStats(): Promise<{ ownersHelped: number; statesServed: number }> {
  try {
    // Use absolute URL for server-side fetch in Next.js
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/stats`, {
      next: { revalidate: 3600 }, // re-fetch at most once per hour
    });

    if (!res.ok) throw new Error("stats fetch failed");
    return res.json();
  } catch {
    return { ownersHelped: 146, statesServed: 35 };
  }
}

export default async function Testimonials() {
  const { ownersHelped, statesServed } = await getStats();

  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#FAF8F4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="reveal text-center mb-12 sm:mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8E3012] mb-4 sm:mb-6">
            From the people who&apos;ve been through it
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight max-w-2xl mx-auto leading-tight">
            Don&apos;t take my word for it.
          </h2>
        </div>

        {/* Interactive carousel + grid + CTA (client component) */}
        <TestimonialsCarousel
          testimonials={testimonials}
          ownersHelped={ownersHelped}
          statesServed={statesServed}
        />
      </div>
    </section>
  );
}
