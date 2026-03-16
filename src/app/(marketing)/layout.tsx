import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "../components/ScrollReveal";
import MobileNav from "../components/MobileNav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4]">
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
              className="text-xs font-medium text-[#555555] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              About
            </Link>
            <Link
              href="/process"
              className="text-xs font-medium text-[#555555] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              Process
            </Link>
            <Link
              href="/faq"
              className="text-xs font-medium text-[#555555] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              FAQ
            </Link>
            <Link
              href="/resources"
              className="text-xs font-medium text-[#555555] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              Resources
            </Link>
            <Link
              href="/quizzes"
              className="text-xs font-medium text-[#555555] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              Quizzes
            </Link>
            <Link
              href="/contact"
              className="text-xs font-medium text-[#555555] hover:text-[#1a1a1a] transition-colors tracking-wide uppercase link-underline"
            >
              Contact
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
      <footer className="bg-[#0c1929] text-[#9a9a9a] py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 sm:gap-10">
            <div>
              <Link href="/" className="inline-block mb-4">
                <Image
                  src="/images/White WP Transparent.png"
                  alt="Waypoint Franchise Advisors"
                  width={160}
                  height={160}
                  className="h-14 w-auto"
                />
              </Link>
              <p className="text-sm leading-relaxed text-[#9a9a9a]">
                Guidance from Whitefish, Montana. Helping people find the
                franchise that fits their life. Not the other way around.
              </p>
            </div>
            <div>
              <h3 className="text-[#c08b3e] font-medium text-xs mb-3 sm:mb-4 uppercase tracking-[0.2em]">
                Navigate
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors inline-block py-1">
                    About Kelsey
                  </Link>
                </li>
                <li>
                  <Link href="/process" className="hover:text-white transition-colors inline-block py-1">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition-colors inline-block py-1">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/resources" className="hover:text-white transition-colors inline-block py-1">
                    Resources
                  </Link>
                </li>
                <li>
                  <Link href="/quizzes" className="hover:text-white transition-colors inline-block py-1">
                    Quizzes
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors inline-block py-1">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book" className="hover:text-white transition-colors inline-block py-1">
                    Book a Free Call
                  </Link>
                </li>
              </ul>
            </div>
          <div>
              <h3 className="text-[#c08b3e] font-medium text-xs mb-3 sm:mb-4 uppercase tracking-[0.2em]">
                Guides &amp; Tools
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/quizzes" className="hover:text-white transition-colors inline-block py-1">
                    Free Quizzes
                  </Link>
                </li>
                <li>
                  <Link href="/investment" className="hover:text-white transition-colors inline-block py-1">
                    Investment Guide
                  </Link>
                </li>
                <li>
                  <Link href="/glossary" className="hover:text-white transition-colors inline-block py-1">
                    Franchise Glossary
                  </Link>
                </li>
                <li>
                  <Link href="/franchise-consultant-vs-broker" className="hover:text-white transition-colors inline-block py-1">
                    Consultant vs. Broker
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-[#c08b3e] font-medium text-xs mb-3 sm:mb-4 uppercase tracking-[0.2em]">
                Contact
              </h3>
              <a
                href="mailto:kelsey@waypointfranchise.com"
                className="text-sm hover:text-white transition-colors inline-block py-1 break-all sm:break-normal"
              >
                kelsey@waypointfranchise.com
              </a>
              <div className="mt-2 flex items-center gap-3">
                <a
                  href="tel:+12149951062"
                  className="text-sm hover:text-white transition-colors py-1"
                >
                  (214) 995-1062
                </a>
                <a
                  href="sms:+12149951062"
                  className="text-[10px] font-semibold uppercase tracking-wider text-[#0c1929] bg-[#d4a55a] hover:bg-[#e2be80] px-2 py-0.5 rounded transition-colors"
                >
                  Text me
                </a>
              </div>
              <p className="mt-3 text-xs text-[#888888]">
                Whitefish, Montana
              </p>
            </div>
          </div>
          {/* Social media icons */}
          <div className="border-t border-white/5 mt-10 sm:mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#888888] uppercase tracking-widest">Follow along</p>
            <div className="flex items-center gap-5">
              {/* LinkedIn */}
              <a href="https://www.linkedin.com/in/kelsey-stuart-014b7b50/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-[#555] hover:text-[#d4a55a] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              {/* Instagram */}
              <a href="https://www.instagram.com/franchise_match_maker/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#555] hover:text-[#d4a55a] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              {/* Facebook */}
              <a href="https://www.facebook.com/kelsey.stuart.94" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#555] hover:text-[#d4a55a] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              {/* X / Twitter */}
              <a href="https://x.com/__Waypoint" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-[#555] hover:text-[#d4a55a] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L2.25 2.25h6.222l4.254 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* YouTube */}
              <a href="https://www.youtube.com/@Waypoint-Franchise" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-[#555] hover:text-[#d4a55a] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              {/* TikTok */}
              <a href="https://www.tiktok.com/@waypoint007" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-[#555] hover:text-[#d4a55a] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/></svg>
              </a>
            </div>
          </div>
          <div className="border-t border-white/5 mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 text-xs text-[#888888]">
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
