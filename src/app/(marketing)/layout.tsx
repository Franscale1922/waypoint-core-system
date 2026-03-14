import Link from "next/link";
import ScrollReveal from "../components/ScrollReveal";
import MobileNav from "../components/MobileNav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] overflow-x-hidden">
      <ScrollReveal />

      {/* Navigation */}
      <header className="sticky top-0 z-50 glass border-b border-[#e2ddd2]/60">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <span className="text-base sm:text-lg font-bold text-[#1a1a1a] tracking-tight">
              Waypoint
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-[#c08b3e] uppercase tracking-[0.15em]">
              Franchise Advisors
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-6 md:gap-8">
            <Link
              href="/about"
              className="text-xs font-medium text-[#7a7a7a] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              About
            </Link>
            <Link
              href="/process"
              className="text-xs font-medium text-[#7a7a7a] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              Process
            </Link>
            <Link
              href="/faq"
              className="text-xs font-medium text-[#7a7a7a] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              FAQ
            </Link>
            <Link
              href="/scorecard"
              className="text-xs font-medium text-[#7a7a7a] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              Quiz
            </Link>
            <Link
              href="/book"
              className="text-xs font-semibold tracking-wide uppercase text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] px-5 py-2.5 rounded-lg transition-all press-effect"
            >
              Book a Call
            </Link>
          </div>

          {/* Mobile hamburger */}
          <MobileNav />
        </nav>
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-[#0c1929] text-[#7a7a7a] py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 sm:gap-10">
            <div>
              <span className="text-white font-bold text-base tracking-tight block mb-3 sm:mb-4">
                Waypoint Franchise Advisors
              </span>
              <p className="text-sm leading-relaxed text-[#555]">
                Guidance from Whitefish, Montana. Helping people find the
                franchise that fits their life. Not the other way around.
              </p>
            </div>
            <div>
              <h4 className="text-[#c08b3e] font-medium text-xs mb-3 sm:mb-4 uppercase tracking-[0.2em]">
                Navigate
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/process" className="hover:text-white transition-colors inline-block py-1">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/scorecard" className="hover:text-white transition-colors inline-block py-1">
                    Readiness Quiz
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition-colors inline-block py-1">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/book" className="hover:text-white transition-colors inline-block py-1">
                    Book a Free Call
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-white transition-colors inline-block py-1">
                    About Kelsey
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#c08b3e] font-medium text-xs mb-3 sm:mb-4 uppercase tracking-[0.2em]">
                Contact
              </h4>
              <a
                href="mailto:kelsey@waypointfranchise.com"
                className="text-sm hover:text-white transition-colors inline-block py-1 break-all sm:break-normal"
              >
                kelsey@waypointfranchise.com
              </a>
              <p className="mt-3 text-xs text-[#444]">
                Whitefish, Montana
              </p>
            </div>
          </div>
          <div className="border-t border-white/5 mt-10 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs text-[#444]">
            <span>
              &copy; {new Date().getFullYear()} Waypoint Franchise Advisors
            </span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <span>Free to candidates. Franchise brands pay the referral fee.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
