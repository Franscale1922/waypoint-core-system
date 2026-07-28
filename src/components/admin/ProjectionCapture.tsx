"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";

type Finding = { leakClass: string; span: string; index: number; why: string };

/**
 * Paste the brand-introduction script for one confirmed brand.
 *
 * The refusal path is the point of this component, so it is shown in full rather than collapsed to
 * "invalid": every leak finding is listed with the exact text that tripped it, so a rewrite fixes
 * them in one pass. A validator whose errors are unreadable gets worked around, which is the
 * failure mode the guard module's own docblock names.
 */
export function ProjectionCapture({
  runId,
  waypointBrandId,
  matchDecisionId,
  existingText,
  existingProjectionId,
}: {
  runId: string;
  waypointBrandId: string;
  matchDecisionId: string;
  existingText: string | null;
  existingProjectionId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(existingText ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);

  async function save() {
    setBusy(true);
    setError(null);
    setFindings([]);
    try {
      const res = await fetch("/api/match-workspace/projections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          waypointBrandId,
          matchDecisionId,
          bodyText: text,
          sourceSkill: "brand-introduction-scripts",
          supersedesId: existingProjectionId,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? `Could not save (${res.status}).`);
        setFindings(Array.isArray(body?.findings) ? body.findings : []);
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        {existingText ? "Edit candidate-facing text" : "Add candidate-facing text"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Paste the brand-introduction script for this brand."
        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 font-mono"
      />
      <p className="text-xs text-slate-400">
        Checked before it is stored. Anything internal (a score, the 1-to-5 scale, Item 19,
        confidence labels, flags, field names, or wording lifted from this run&apos;s evidence) is
        refused and shown below.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || pending || !text.trim()}
          className="rounded-lg border border-slate-800 bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? "Checking..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-600 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      ) : null}

      {findings.length > 0 ? (
        <ul className="text-xs text-red-700 space-y-0.5 border border-red-100 bg-red-50 rounded-lg p-2">
          {findings.map((f, i) => (
            <li key={`${f.index}-${i}`}>
              <span className="font-mono font-semibold">{JSON.stringify(f.span)}</span>{" "}
              <span className="text-red-500">({f.leakClass})</span> {f.why}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
