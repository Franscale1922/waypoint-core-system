import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Waypoint Franchise Advisors",
  description: "Privacy policy for waypointfranchise.com",
  alternates: { canonical: "https://waypointfranchise.com/privacy" },
  robots: { index: false },
};

export default function PrivacyPage() {
  const updated = "March 12, 2026";
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <section className="max-w-2xl mx-auto px-6 py-20 sm:py-28">
        <Link href="/" className="text-xs text-[#C8622E] tracking-widest uppercase hover:underline mb-10 inline-block">
          Back to Home
        </Link>
        <h1 className="font-playfair text-4xl mb-3">Privacy Policy</h1>
        <p className="text-sm text-[#5a5a4a] mb-12">Last updated: {updated}</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3a3a2e]">
          <section>
            <h2 className="font-playfair text-xl mb-3">What we collect</h2>
            <p className="leading-relaxed">
              When you submit the Franchise Readiness Quiz or book a call, you voluntarily provide your name, email address, and information about your goals and financial situation. We collect this information solely to provide personalized franchise advisory services.
            </p>
            <p className="leading-relaxed mt-4">
              We also collect standard analytics data (pages visited, time on site, general location) through Google Analytics. This data is aggregated and does not identify you personally.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">How we use it</h2>
            <p className="leading-relaxed">
              Your information is used to communicate with you about franchise opportunities and to improve our advisory service. We send a series of follow-up emails after quiz completion. You can unsubscribe at any time via the link in any email.
            </p>
            <p className="leading-relaxed mt-4">
              We do not sell, rent, or share your personal information with third parties for marketing purposes. Franchise brands we introduce you to receive only the information necessary to begin a conversation, and only with your knowledge.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">How we store it</h2>
            <p className="leading-relaxed">
              Your data is stored in a secure PostgreSQL database. We use industry-standard encryption in transit and at rest. We retain your information for up to three years or until you request deletion.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Your rights</h2>
            <p className="leading-relaxed">
              You can request access to, correction of, or deletion of your personal information at any time by emailing{" "}
              <a href="mailto:kelsey@waypointfranchise.com" className="text-[#C8622E] hover:underline">
                kelsey@waypointfranchise.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Cookies</h2>
            <p className="leading-relaxed">
              This site uses cookies for analytics (Google Analytics) and to remember your quiz progress. You can disable cookies in your browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Contact</h2>
            <p className="leading-relaxed">
              Questions about this policy? Email{" "}
              <a href="mailto:kelsey@waypointfranchise.com" className="text-[#C8622E] hover:underline">
                kelsey@waypointfranchise.com
              </a>
              .
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
