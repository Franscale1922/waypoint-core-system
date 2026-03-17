import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Waypoint Franchise Advisors",
  description: "Terms of use for waypointfranchise.com",
  alternates: { canonical: "https://waypointfranchise.com/terms" },
  robots: { index: false },
};

export default function TermsPage() {
  const updated = "March 12, 2026";
  return (
    <main className="bg-[#FAF8F4] text-[#0c1929]">
      <section className="max-w-2xl mx-auto px-6 py-20 sm:py-28">
        <Link href="/" className="text-xs text-[#C8622E] tracking-widest uppercase hover:underline mb-10 inline-block">
          Back to Home
        </Link>
        <h1 className="font-playfair text-4xl mb-3">Terms of Use</h1>
        <p className="text-sm text-[#5a5a4a] mb-12">Last updated: {updated}</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-[#3a3a2e]">
          <section>
            <h2 className="font-playfair text-xl mb-3">Use of this site</h2>
            <p className="leading-relaxed">
              Waypoint Franchise Advisors operates waypointfranchise.com as a free educational and advisory resource. By using this site, you agree to these terms. If you do not agree, please do not use the site.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">No investment advice</h2>
            <p className="leading-relaxed">
              Information on this site, including quiz results, blog content, and email communications, is provided for general informational and educational purposes only. Nothing here constitutes legal, financial, or investment advice. You are responsible for conducting your own due diligence before making any business decision. We strongly encourage you to consult qualified legal and financial advisors before signing any agreement.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Our role</h2>
            <p className="leading-relaxed">
              Kelsey Stuart and Waypoint Franchise Advisors act as a franchise broker or consultant. When a candidate we introduce to a franchise brand chooses to purchase a franchise, we may receive a referral fee from that brand. This fee is paid by the brand, not by you, and it does not affect what you pay for the franchise license.
            </p>
            <p className="leading-relaxed mt-4">
              Our recommendations are based on our knowledge of brands and our understanding of your stated goals. We do not guarantee the performance or suitability of any franchise for any individual.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Accuracy of information</h2>
            <p className="leading-relaxed">
              We make reasonable efforts to keep information on this site current and accurate. We do not warrant that any information, including statistics or brand descriptions, is complete or error-free. Franchise performance varies by location, owner, and market conditions.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Limitation of liability</h2>
            <p className="leading-relaxed">
              To the extent permitted by law, Waypoint Franchise Advisors is not liable for any direct, indirect, or consequential losses arising from your use of this site or from any business decisions you make after using our services.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Changes to these terms</h2>
            <p className="leading-relaxed">
              We may update these terms at any time. Continued use of the site after any changes are posted constitutes your acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl mb-3">Contact</h2>
            <p className="leading-relaxed">
              Questions about these terms? Email{" "}
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
