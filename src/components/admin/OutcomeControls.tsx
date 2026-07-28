"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const TYPES = ["introduced", "advanced", "placed", "lost", "withdrawn"] as const;

/**
 * Record a real-world outcome for one confirmed brand.
 *
 * Deliberately not a status dropdown that overwrites. Each submission appends a dated event, so the
 * history of what actually happened survives. Correcting a mistake is a separate act (superseding
 * the wrong event), not an edit of it, which is why there is no "change this" affordance here.
 */
export function OutcomeControls({
  candidateId,
  waypointBrandId,
  originatingRunId,
}: {
  candidateId: string;
  waypointBrandId: string;
  originatingRunId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<(typeof TYPES)[number]>("introduced");
  const [effectiveAt, setEffectiveAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/match-workspace/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          waypointBrandId,
          originatingRunId,
          type,
          reason: reason.trim() || null,
          effectiveAt: new Date(effectiveAt + "T12:00:00Z").toISOString(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? `Could not record the outcome (${res.status}).`);
        return;
      }
      setReason("");
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={effectiveAt}
          onChange={(e) => setEffectiveAt(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
          aria-label="When it happened"
        />
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why (optional)"
          className="flex-1 min-w-[10rem] rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || pending}
          className="rounded-lg border border-slate-800 bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? "Recording..." : "Record outcome"}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
