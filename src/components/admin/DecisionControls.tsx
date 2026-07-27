"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ListChecks, X } from "lucide-react";

const STATES = [
  { value: "shortlist", label: "Shortlist", icon: ListChecks, active: "bg-blue-600 text-white border-blue-600" },
  { value: "final_slate", label: "Final slate", icon: Check, active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "rejected", label: "Reject", icon: X, active: "bg-red-600 text-white border-red-600" },
] as const;

/**
 * The three decision buttons for one scored brand.
 *
 * Every change posts the CURRENT decision's id as `supersedesId`, so the server records a
 * superseding row rather than a second competing one. If the page is stale the server answers 409
 * and the message is shown rather than swallowed, because silently succeeding against a moved
 * chain is how an append-only record stops meaning anything.
 */
export function DecisionControls({
  scoreId,
  currentState,
  currentDecisionId,
}: {
  scoreId: string;
  currentState: string | null;
  currentDecisionId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(state: string) {
    if (state === currentState) return;
    setBusy(state);
    setError(null);
    try {
      const res = await fetch("/api/match-workspace/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreId, state, supersedesId: currentDecisionId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 409
            ? "This brand's decision changed elsewhere. Reload before deciding again."
            : (body?.error ?? `Could not record the decision (${res.status}).`),
        );
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {STATES.map(({ value, label, icon: Icon, active }) => {
          const isCurrent = value === currentState;
          return (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              disabled={pending || busy !== null || isCurrent}
              aria-pressed={isCurrent}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                isCurrent
                  ? active
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              } ${busy === value ? "opacity-60" : ""} disabled:cursor-default`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
