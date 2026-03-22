"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface SendNowButtonProps {
    leadId: string;
    status: string;
}

/**
 * Manual test-send button — only active when lead status is SEQUENCED.
 * Fires workflow/lead.send.start via POST /api/admin/send-now,
 * which triggers senderProcess (push to Instantly + SEQUENCED→SENT).
 */
export function SendNowButton({ leadId, status }: SendNowButtonProps) {
    const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [message, setMessage] = useState("");

    if (status !== "SEQUENCED") return null;

    async function handleSend() {
        if (state === "loading" || state === "done") return;
        setState("loading");
        setMessage("");

        try {
            const res = await fetch("/api/admin/send-now", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setState("error");
                setMessage(data.error ?? "Send failed");
                return;
            }

            setState("done");
            setMessage("Queued — check Inngest dashboard for run status");
        } catch {
            setState("error");
            setMessage("Network error");
        }
    }

    const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors";
    const styles = {
        idle:    `${base} bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer`,
        loading: `${base} bg-emerald-400 text-white cursor-wait`,
        done:    `${base} bg-slate-100 text-slate-500 cursor-default`,
        error:   `${base} bg-red-100 text-red-700 cursor-pointer`,
    };

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleSend}
                disabled={state === "loading" || state === "done"}
                className={styles[state]}
                title="Trigger senderProcess now — bypasses warmupScheduler"
            >
                <Send className="w-3.5 h-3.5" />
                {state === "loading" ? "Queueing…" : state === "done" ? "Sent to Inngest ✓" : "Send Now"}
            </button>
            {message && (
                <span className={`text-xs ${state === "error" ? "text-red-500" : "text-slate-400"}`}>
                    {message}
                </span>
            )}
        </div>
    );
}
