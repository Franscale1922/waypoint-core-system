/**
 * A labelled progress bar for a score.
 *
 * Extracted from the lead detail page so the match worksheet reuses it rather than growing a
 * near-identical copy. It needed one generalization to be reusable: leads score 0-100 and match
 * scores are 0-1, so the scale is a prop. Thresholds are expressed as FRACTIONS of `max`, which
 * keeps the existing lead colouring identical (70/100 and 50/100) while giving match scores the
 * same meaning rather than an arbitrary one.
 */
export function ScoreBar({
  score,
  max = 100,
  decimals = 0,
}: {
  score: number;
  /** Upper bound of the scale. 100 for lead scores, 1 for match scores. */
  max?: number;
  /** Digits after the decimal point in the printed value. */
  decimals?: number;
}) {
  const ratio = max === 0 ? 0 : score / max;
  const pct = Math.max(0, Math.min(100, ratio * 100));
  const color = ratio >= 0.7 ? "bg-emerald-500" : ratio >= 0.5 ? "bg-blue-500" : "bg-slate-300";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-2xl font-bold text-slate-900 w-14 text-right tabular-nums">
        {score.toFixed(decimals)}
      </span>
    </div>
  );
}
