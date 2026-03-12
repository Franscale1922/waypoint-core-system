import Link from "next/link";

const testimonials = [
  {
    quote:
      "I came in excited about two different concepts. Kelsey helped me walk through the real numbers and the day-to-day reality of each one. By the end of those conversations, I had a much clearer picture of what I actually wanted. The one I chose has been a great fit.",
    name: "Marcus T.",
    role: "Former Regional Director, now franchise owner",
    location: "Denver, CO",
    score: "Readiness Score: 78",
  },
  {
    quote:
      "I thought I wanted a food concept. After one conversation with Kelsey, I realized I didn't want the hours. He matched me to a service brand I'd never heard of. Two years in, best decision I've made.",
    name: "Jennifer R.",
    role: "Corporate expat, franchise owner since 2023",
    location: "Austin, TX",
    score: "Readiness Score: 84",
  },
  {
    quote:
      "Most consultants send you a list and disappear. Kelsey stayed involved through the whole process, from reviewing the legal agreement to talking through what other owners actually experienced. Felt like having someone truly in my corner.",
    name: "David K.",
    role: "Trailing spouse, now owner of two units",
    location: "Nashville, TN",
    score: "Readiness Score: 71",
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#FAF8F4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="reveal text-center mb-12 sm:mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c08b3e] mb-4 sm:mb-6">
            From the people who&apos;ve been through it
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight max-w-2xl mx-auto leading-tight">
            Don&apos;t take my word for it.
          </h2>
        </div>

        {/* Testimonial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="reveal flex flex-col bg-white rounded-2xl p-7 sm:p-8 border border-[#e2ddd2] shadow-sm hover:shadow-md transition-shadow duration-300"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Quote mark */}
              <div
                className="text-5xl sm:text-6xl font-serif text-[#d4a55a] leading-none mb-4 select-none"
                aria-hidden="true"
              >
                &ldquo;
              </div>

              {/* Quote text */}
              <p className="text-sm sm:text-base text-[#3a3a3a] leading-relaxed flex-1">
                {t.quote}
              </p>

              {/* Copper rule */}
              <div className="h-px bg-[#d4a55a]/30 my-5 sm:my-6" />

              {/* Attribution */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{t.name}</p>
                  <p className="text-xs text-[#7a7a7a] mt-0.5">{t.role}</p>
                  <p className="text-xs text-[#7a7a7a]">{t.location}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-block text-[10px] font-medium text-[#c08b3e] bg-[#fdf5e6] px-2 py-1 rounded-md tracking-wide">
                    {t.score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="reveal mt-12 sm:mt-16 text-center">
          <p className="text-sm text-[#7a7a7a] mb-5">
            146+ owners helped across 35 states. All free.
          </p>
          <Link
            href="/scorecard"
            className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold tracking-wide text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all press-effect min-h-[48px]"
          >
            Take the Readiness Quiz
          </Link>
        </div>
      </div>
    </section>
  );
}
