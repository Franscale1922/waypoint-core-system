/**
 * A titled card. Extracted from the lead detail page so the match worksheet reuses the same
 * surface language (`rounded-2xl border-slate-200`) instead of reimplementing it.
 */
export function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** Optional trailing content on the header row (counts, actions). */
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        {icon}
        <span>{title}</span>
        {right ? <div className="ml-auto font-normal">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}
