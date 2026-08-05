"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Key, RefreshCw, AlertTriangle, CheckCircle2, MailCheck } from "lucide-react";

/** Mirrors UnsuppressOutcome in src/lib/email-suppression.ts. */
type UnsuppressResult = {
    ok: boolean;
    listRowsRestored: number;
    canonicalCleared: boolean;
    blockedBy: string | null;
    latchedLead: { id: string; suppressionReason: string | null } | null;
    error?: string;
};

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        openAiApiKey: "",
        resendApiKey: "",
        maxSendsPerDay: "50"
    });
    const [optOutEmail, setOptOutEmail] = useState("");
    const [isReversing, setIsReversing] = useState(false);
    const [reverseResult, setReverseResult] = useState<UnsuppressResult | null>(null);

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                setFormData({
                    openAiApiKey: data.openAiApiKey || "",
                    resendApiKey: data.resendApiKey || "",
                    maxSendsPerDay: data.maxSendsPerDay?.toString() || "50"
                });
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) alert("Settings saved successfully!");
        } catch (err) {
            alert("Failed to save settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReverseOptOut = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsReversing(true);
        setReverseResult(null);
        try {
            const res = await fetch("/api/admin/resubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: optOutEmail })
            });
            const data = await res.json();
            if (!res.ok) {
                setReverseResult({
                    ok: false, listRowsRestored: 0, canonicalCleared: false,
                    blockedBy: null, latchedLead: null,
                    error: data.error || `Request failed (${res.status})`
                });
            } else {
                setReverseResult(data as UnsuppressResult);
            }
        } catch {
            setReverseResult({
                ok: false, listRowsRestored: 0, canonicalCleared: false,
                blockedBy: null, latchedLead: null,
                error: "Could not reach the server."
            });
        } finally {
            setIsReversing(false);
        }
    };

    /** True when the call succeeded but there was no opt-out on record to undo. */
    const reversedNothing =
        reverseResult?.ok === true &&
        reverseResult.listRowsRestored === 0 &&
        !reverseResult.canonicalCleared;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                    System Settings
                </h1>
                <p className="text-slate-500 mt-2">Manage your API keys and global delivery caps safely.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Key className="w-4 h-4 text-slate-400" />
                            <label className="font-semibold text-slate-800">OpenAI API Key</label>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">Required for the Personalizer & Reply Guardian agents.</p>
                        <input
                            type="password"
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white text-slate-900 font-mono"
                            placeholder="sk-..."
                            value={formData.openAiApiKey}
                            onChange={e => setFormData({ ...formData, openAiApiKey: e.target.value })}
                        />
                    </div>

                    <hr className="border-slate-100" />

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Key className="w-4 h-4 text-slate-400" />
                            <label className="font-semibold text-slate-800">Resend API Key</label>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">Required for the Sender agent to dispatch emails.</p>
                        <input
                            type="password"
                            className="w-full border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white text-slate-900 font-mono"
                            placeholder="re_..."
                            value={formData.resendApiKey}
                            onChange={e => setFormData({ ...formData, resendApiKey: e.target.value })}
                        />
                    </div>

                    <hr className="border-slate-100" />

                    <div>
                        <label className="font-semibold text-slate-800 mb-2 block">Max Sends Per Day (Per Inbox)</label>
                        <p className="text-sm text-slate-500 mb-3">Caps the daily volume to protect domain reputation.</p>
                        <input
                            type="number"
                            className="w-32 border border-slate-200 rounded-lg px-4 py-3"
                            value={formData.maxSendsPerDay}
                            onChange={e => setFormData({ ...formData, maxSendsPerDay: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Save Configuration
                        </button>
                    </div>
                </form>
            </div>

            {/*
              * Reversing an opt-out needs a person in the loop, which is why it
              * lives here and not behind a link in an email. It only ever clears
              * a SELF-SERVICE unsubscribe: a bounce, a spam complaint or a
              * domain rule refuses, and says which.
              */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleReverseOptOut} className="p-8 space-y-4">
                    <div className="flex items-center gap-2">
                        <MailCheck className="w-4 h-4 text-slate-400" />
                        <label className="font-semibold text-slate-800">Reverse an opt-out</label>
                    </div>
                    <p className="text-sm text-slate-500">
                        For when someone says they stopped getting email they still wanted. This clears a
                        self-service unsubscribe across every list. It will refuse if the address hard-bounced,
                        reported spam, or is covered by a domain-level block.
                    </p>

                    <div className="flex gap-3">
                        <input
                            type="email"
                            required
                            className="flex-1 border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 focus:bg-white text-slate-900"
                            placeholder="person@example.com"
                            value={optOutEmail}
                            onChange={e => setOptOutEmail(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={isReversing || !optOutEmail.trim()}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isReversing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                            Reverse
                        </button>
                    </div>

                    {reverseResult && (
                        <div className="space-y-3 pt-2">
                            {reverseResult.error && (
                                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <p className="text-sm text-red-800">{reverseResult.error}</p>
                                </div>
                            )}

                            {!reverseResult.ok && !reverseResult.error && (
                                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div className="text-sm text-amber-900">
                                        <p className="font-semibold">Not reversed. Nothing was changed.</p>
                                        <p className="mt-1">
                                            This address is suppressed by {reverseResult.blockedBy}, which is not a
                                            self-service unsubscribe. Clearing it here could put mail in front of a dead
                                            or hostile address, so it has to be handled deliberately.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {reversedNothing && (
                                <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                    <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div className="text-sm text-slate-700">
                                        <p className="font-semibold">No opt-out found for that address.</p>
                                        <p className="mt-1">
                                            Nothing needed reversing. If they are still not receiving mail, the cause is
                                            somewhere other than an unsubscribe. Check the address for a typo first.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {reverseResult.ok && !reversedNothing && (
                                <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div className="text-sm text-emerald-900">
                                        <p className="font-semibold">Opt-out reversed.</p>
                                        <p className="mt-1">
                                            {reverseResult.listRowsRestored} record
                                            {reverseResult.listRowsRestored === 1 ? "" : "s"} returned to mailable
                                            {reverseResult.canonicalCleared
                                                ? ", and the master opt-out entry was removed."
                                                : ". There was no master opt-out entry to remove."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {reverseResult.latchedLead && (
                                <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div className="text-sm text-amber-900">
                                        <p className="font-semibold">Cold outreach is still switched off for this person.</p>
                                        <p className="mt-1">
                                            Their lead record is marked suppressed
                                            {reverseResult.latchedLead.suppressionReason
                                                ? ` (${reverseResult.latchedLead.suppressionReason})`
                                                : ""}
                                            . That is a separate system from the email sequences and is deliberately not
                                            changed here, because there is no record of what state to put them back into.
                                            Marketing emails will resume; cold outreach will not.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
