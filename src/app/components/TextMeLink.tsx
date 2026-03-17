/**
 * TextMeLink — reusable "Text me" SMS button.
 * Uses the sms: protocol which opens iMessage on iPhone/Mac,
 * or the native SMS app on Android.
 */
export default function TextMeLink({
  variant = "pill",
  className = "",
}: {
  variant?: "pill" | "ghost" | "outline-light";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-1.5 transition-colors";

  const styles = {
    pill: `${base} text-[10px] font-semibold uppercase tracking-wider text-[#0c1929] bg-[#C8622E] hover:bg-[#D4724A] px-2.5 py-1 rounded`,
    ghost: `${base} text-sm font-medium text-[#C8622E] hover:text-[#D4724A]`,
    "outline-light": `${base} text-sm font-semibold tracking-wide text-white border border-white/25 hover:bg-white/10 rounded-lg px-7 py-4 min-h-[48px]`,
  };

  return (
    <a href="sms:+12149951062" className={`${styles[variant]} ${className}`}>
      {/* Message bubble icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      Text me
    </a>
  );
}
