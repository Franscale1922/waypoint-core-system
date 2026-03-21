"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Props =
    | { mode: "single"; leadId: string; onDone?: () => void }
    | { mode: "all"; onDone?: () => void };

type State = "idle" | "loading" | "success" | "error";

export function RegenerateButton(props: Props) {
    const [state, setState] = useState<State>("idle");
    const [message, setMessage] = useState("");

    async function handleClick() {
        const confirmed =
            props.mode === "all"
                ? window.confirm(
                      "Regenerate emails for ALL SEQUENCED leads using the updated prompt? " +
                      "Existing draft emails will be cleared and new ones queued via Inngest.\n\nThis cannot be undone."
                  )
                : window.confirm("Clear and regenerate the draft email for this lead?");

        if (!confirmed) return;

        setState("loading");
        setMessage("");

        try {
            const body =
                props.mode === "all"
                    ? { all: true }
                    : { leadId: props.leadId };

            const res = await fetch("/api/admin/regenerate-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const json = await res.json();

            if (!res.ok) {
                setState("error");
                setMessage(json.error ?? "Something went wrong.");
                return;
            }

            setState("success");
            setMessage(json.message ?? "Done.");
            props.onDone?.();

            // Reset to idle after 5 seconds
            setTimeout(() => {
                setState("idle");
                setMessage("");
            }, 5000);
        } catch {
            setState("error");
            setMessage("Network error — check your connection.");
            setTimeout(() => setState("idle"), 4000);
        }
    }

    // ── Styles ───────────────────────────────────────────────────────────────
    const isAll = props.mode === "all";

    const base =
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all";
    const styles: Record<State, string> = {
        idle:    isAll
                    ? `${base} bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100`
                    : `${base} bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200`,
        loading: `${base} bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed`,
        success: `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`,
        error:   `${base} bg-red-50 text-red-700 border border-red-200`,
    };

    const icons: Record<State, React.ReactNode> = {
        idle:    <RefreshCw className="w-3.5 h-3.5" />,
        loading: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        success: <CheckCircle className="w-3.5 h-3.5" />,
        error:   <AlertCircle className="w-3.5 h-3.5" />,
    };

    const labels: Record<State, string> = {
        idle:    isAll ? "Regenerate all SEQUENCED" : "Regenerate email",
        loading: isAll ? "Queuing…" : "Regenerating…",
        success: message || "Queued!",
        error:   message || "Error",
    };

    return (
        <button
            onClick={handleClick}
            disabled={state === "loading"}
            className={styles[state]}
            title={
                isAll
                    ? "Clear and regenerate emails for all SEQUENCED leads using the updated prompt"
                    : "Clear and regenerate the draft email for this lead"
            }
        >
            {icons[state]}
            <span>{labels[state]}</span>
        </button>
    );
}
