import type { Metadata } from "next";
import ContactForm from "../../components/ContactForm";

export const metadata: Metadata = {
  title: "Contact | Waypoint Franchise Advisors",
  description: "Ask a question, share where you are in the process, or just say hello. Kelsey responds within one business day.",
  alternates: { canonical: "https://waypointfranchise.com/contact" },
  openGraph: {
    title: "Contact Kelsey | Waypoint Franchise Advisors",
    description: "Ask a question or start a conversation. No pitch, no pressure.",
    url: "https://waypointfranchise.com/contact",
  },
};

export default function ContactPage() {
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">

      {/* Hero */}
      <section className="bg-[#0c1929] pt-24 pb-16 px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a55a] mb-4">
          Get in Touch
        </p>
        <h1 className="font-playfair text-4xl sm:text-5xl text-white mb-4">
          Ask whatever is on your mind
        </h1>
        <p className="text-white/70 max-w-md mx-auto text-base leading-relaxed">
          Not ready to book a call yet? That is fine. Send a message and I will get back to you within one business day.
        </p>
      </section>

      {/* Form + alternatives */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12 items-start">

          {/* Form */}
          <div className="bg-white border border-[#e2ddd2] rounded-2xl p-6 sm:p-10 shadow-sm">
            <ContactForm />
          </div>

          {/* Sidebar — faster options */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c08b3e] mb-3">
                Faster options
              </p>
              <div className="space-y-4">
                <a
                  href="tel:+12149951062"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0c1929] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a55a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0c1929] group-hover:text-[#c08b3e] transition-colors">(214) 995-1062</p>
                    <p className="text-xs text-[#7a7a7a]">Call directly</p>
                  </div>
                </a>

                <a
                  href="sms:+12149951062"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0c1929] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a55a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0c1929] group-hover:text-[#c08b3e] transition-colors">Text Kelsey</p>
                    <p className="text-xs text-[#7a7a7a]">(214) 995-1062</p>
                  </div>
                </a>

                <a
                  href="mailto:kelsey@waypointfranchise.com"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0c1929] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4a55a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0c1929] group-hover:text-[#c08b3e] transition-colors">kelsey@waypointfranchise.com</p>
                    <p className="text-xs text-[#7a7a7a]">Direct email</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="border-t border-[#e2ddd2] pt-6">
              <p className="text-xs text-[#7a7a7a] leading-relaxed mb-4">
                Ready to put a time on the calendar?
              </p>
              <a
                href="/book"
                className="inline-flex items-center justify-center w-full px-6 py-3.5 text-sm font-semibold text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] rounded-lg transition-all"
              >
                Book a Free 30-Min Call
              </a>
            </div>

            <p className="text-xs text-[#9a9a8a] leading-relaxed">
              Based in Whitefish, Montana. Responding Mon–Fri.
            </p>
          </div>

        </div>
      </section>

    </main>
  );
}
