"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2, TriangleAlert } from "lucide-react";

type Props =
    | { mode: "single"; leadId: string; onDone?: () => void }
    | { mode: "all"; onDone?: () => void };

type State = "idle" | "confirm" | "loading" | "success" | "error";

export function RegenerateButton(props: Props) {
    const [state, setState] = useState<State>("idle");
    const [message, setMessage] = useState("");
    const isAll = props.mode === "all";

    async function handleConfirm() {
        setState("loading");
        setMessage("");

        try {
            const body = isAll
                ? { all: true }
                : { leadId: (props as { mode: "single"; leadId: string }).leadId };

            const res = await fetch("/api/admin/regenerate-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const json = await res.json();

            if (!res.ok) {
                setState("error");
                setMessage(json.error ?? "Something went wrong.");
                setTimeout(() => setState("idle"), 4000);
                return;
            }

            setState("success");
            setMessage(json.message ?? "Done.");
            props.onDone?.();
            setTimeout(() => setState("idle"), 6000);
        } catch {
            setState("error");
            setMessage("Network error — check your connection.");
            setTimeout(() => setState("idle"), 4000);
        }
    }

    // ── Idle: primary button ────────────────────────────────────────────────
    if (state === "idle") {
        return (
            <button
                onClick={() => setState("confirm")}
                className={
                    isAll
                        ? "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        : "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }
            >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isAll ? "Regenerate all SEQUENCED" : "Regenerate email"}</span>
            </button>
        );
    }

    // ── Confirm: inline yes/cancel ─────────────────────────────────────────
    if (state === "confirm") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 border border-amber-300">
                <TriangleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-800">
                    {isAll ? "Clear & regenerate all SEQUENCED emails?" : "Clear & regenerate this email?"}
                </span>
                <button
                    onClick={handleConfirm}
                    className="ml-1 px-2 py-0.5 rounded bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                >
                    Yes
                </button>
                <button
                    onClick={() => setState("idle")}
                    className="px-2 py-0.5 rounded bg-white text-amber-700 border border-amber-300 text-xs font-semibold hover:bg-amber-50 transition-colors"
                >
                    Cancel
                </button>
            </div>
        );
    }

    // ── Loading ────────────────────────────────────────────────────────────
    if (state === "loading") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 border border-slate-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isAll ? "Queuing…" : "Regenerating…"}</span>
            </div>
        );
    }

    // ── Success ────────────────────────────────────────────────────────────
    if (state === "success") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{message || "Queued!"}</span>
            </div>
        );
    }

    // ── Error ──────────────────────────────────────────────────────────────
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{message || "Error"}</span>
        </div>
    );
}
