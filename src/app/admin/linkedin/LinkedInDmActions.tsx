"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LinkedInDmActions({ leadId }: { leadId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState<"sent" | "skip" | null>(null);

    async function mark(action: "sent" | "skip") {
        setLoading(action);
        const endpoint = action === "sent" ? "dm-sent" : "dm-skip";
        await fetch(`/api/admin/leads/${leadId}/${endpoint}`, { method: "POST" });
        router.refresh();
        setLoading(null);
    }

    return (
        <div className="flex items-center gap-2 mt-3">
            <button
                onClick={() => mark("sent")}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
                {loading === "sent" ? "Saving…" : "✓ Mark DM Sent"}
            </button>
            <button
                onClick={() => mark("skip")}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
            >
                {loading === "skip" ? "Saving…" : "Skip"}
            </button>
        </div>
    );
}
