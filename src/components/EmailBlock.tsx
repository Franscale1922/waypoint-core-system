"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";

// Phrases imported from templates.ts — duplicated here so this Client Component
// doesn't bundle the full server-only templates module. Keep in sync with
// PROHIBITED_PHRASES in src/lib/templates.ts.
const PROHIBITED_PHRASES = [
    "I hope this email finds you well",
    "I came across your profile",
    "I'm reaching out because",
    "I noticed",
    "I saw your",
    "Congratulations on",
    "just touching base",
    "checking in",
    "touching base",
    "hope you're having a great",
    "in today's world",
    "at the end of the day",
    "cutting-edge",
    "leverage",
    "solutions",
    "synergy",
    "paradigm",
    "delve",
    "navigating",
    "testament",
    "realm",
    "tapestry",
    "foster",
    "catalyst",
    "Moreover,",
    "Furthermore,",
    "It is worth noting",
    "I've been following",
    "I've been watching",
    "based in",
    "located in",
    "years of experience",
    "you've been at",
    "I see you went to",
    "your alma mater",
    "I'd love to",
    "I would love to",
    "amazing",
    "incredible",
    "fantastic",
    "excited to",
    "thrilled to",
    "hop on a call",
    "find 15 minutes on your calendar",
    "schedule a call",
    "book a meeting",
    "let's connect",
];

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Split draftEmail into body + CAN-SPAM footer on the `\n\n--\n` boundary. */
function splitEmail(raw: string): { body: string; footer: string | null } {
    // The deterministic footer starts exactly with "\n\n--\n"
    const SEPARATOR = "\n\n--\n";
    const idx = raw.indexOf(SEPARATOR);
    if (idx === -1) return { body: raw.trim(), footer: null };
    return {
        body: raw.slice(0, idx).trim(),
        footer: raw.slice(idx + SEPARATOR.length - 1).trim(), // keep the "--"
    };
}

/** Return any prohibited phrases found in the email body (case-insensitive). */
function findViolations(body: string): string[] {
    const lower = body.toLowerCase();
    return PROHIBITED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EmailBlockProps {
    draftEmail: string;
}

export function EmailBlock({ draftEmail }: EmailBlockProps) {
    const [copied, setCopied] = useState(false);

    const { body, footer } = splitEmail(draftEmail);
    const violations = findViolations(body);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(draftEmail);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for non-HTTPS environments
            const el = document.createElement("textarea");
            el.value = draftEmail;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <div className="space-y-3">
            {/* Voice QC warning — only shown when a banned phrase is detected */}
            {violations.length > 0 && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                        <p className="font-semibold">Voice QC flag — prohibited phrase detected</p>
                        <ul className="mt-1 list-disc list-inside space-y-0.5">
                            {violations.map((v) => (
                                <li key={v} className="font-mono text-xs text-amber-700">
                                    &ldquo;{v}&rdquo;
                                </li>
                            ))}
                        </ul>
                        <p className="mt-1.5 text-xs text-amber-600">
                            Regenerate this lead&apos;s email or manually edit before sending.
                        </p>
                    </div>
                </div>
            )}

            {/* Email body */}
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Draft — plain text · {body.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <button
                        onClick={handleCopy}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                            copied
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy email
                            </>
                        )}
                    </button>
                </div>

                {/* Body text */}
                <div className="px-5 py-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {body}
                </div>

                {/* CAN-SPAM footer — visually separated */}
                {footer && (
                    <div className="px-5 pb-4 pt-3 border-t border-dashed border-slate-200">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                            CAN-SPAM Footer (auto-appended)
                        </p>
                        <p className="text-xs text-slate-400 whitespace-pre-wrap">{footer}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
