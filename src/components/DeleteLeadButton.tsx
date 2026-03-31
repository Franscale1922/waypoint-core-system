"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

// ── Per-row delete button ─────────────────────────────────────────────────────
export function DeleteLeadButton({ id }: { id: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this lead? This cannot be undone.")) return;
        setLoading(true);
        await fetch(`/api/leads/${id}`, { method: "DELETE" });
        router.refresh();
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            title="Delete lead"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
    );
}

// ── Bulk delete by status ─────────────────────────────────────────────────────
export function BulkDeleteButton({ status, label }: { status: string; label: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        if (!confirm(`Delete ALL ${label} leads? This cannot be undone.`)) return;
        setLoading(true);
        const res = await fetch(`/api/leads?status=${status}`, { method: "DELETE" });
        const data = await res.json();
        setLoading(false);
        alert(`Deleted ${data.count} lead(s).`);
        router.refresh();
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? "Deleting…" : label}
        </button>
    );
}
