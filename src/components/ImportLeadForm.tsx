"use client";

import { useState, useRef } from "react";
import { PlusCircle, Loader2, Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";

// ── Column name aliases from Sales Navigator & Evaboot CSV/TSV exports ───────
const COLUMN_ALIASES: Record<string, string> = {
    // name — Evaboot exports "Full Name" as a combined column
    "full name": "name",
    "first name + last name": "name",
    "name": "name",
    // split name columns — Evaboot exports "First Name" + "Last Name" separately
    "first name": "firstName",
    "last name": "lastName",
    // linkedinUrl — Evaboot uses "Linkedin URL Public" (do NOT map "Linkedin URL Unique ID" —
    // it comes after "Linkedin URL Public" in Evaboot's column order and would overwrite the
    // clean public slug URL with an unreadable hash like ACwAAASP...)
    "linkedin url": "linkedinUrl",
    "linkedin url public": "linkedinUrl",
    "profile url": "linkedinUrl",
    "linkedin profile url": "linkedinUrl",
    "url": "linkedinUrl",
    // email
    "email": "email",
    // title — Evaboot uses "Current Job"
    "title": "title",
    "job title": "title",
    "current title": "title",
    "current job": "title",
    "position": "title",
    // company — Evaboot uses "Company Name"
    "company": "company",
    "company name": "company",
    "current company": "company",
    "organization": "company",
    // country / location
    "country": "country",
    "location": "country",
    "geography": "country",
    // signals
    "company news event": "companyNewsEvent",
    "companynewsevent": "companyNewsEvent",
    "recent post summary": "recentPostSummary",
    "recentpostsummary": "recentPostSummary",
    "career trigger": "careerTrigger",
    "careertrigger": "careerTrigger",
    "franchise angle": "franchiseAngle",
    "franchiseangle": "franchiseAngle",
    // tenure — Evaboot exports "Years in Position"
    "years in current position": "yearsInCurrentRole",
    "years in position": "yearsInCurrentRole",
    "yearsincurrentposition": "yearsInCurrentRole",
    "tenure (years)": "yearsInCurrentRole",
    "tenure": "yearsInCurrentRole",
};

type LeadRow = {
    name: string;
    linkedinUrl: string;
    email?: string;
    title: string;
    company: string;
    country?: string;
    companyNewsEvent?: string;
    recentPostSummary?: string;
    careerTrigger?: string;
    franchiseAngle?: string;
    yearsInCurrentRole?: number;  // Scoring signal only — never referenced in email
    _valid: boolean;
    _error?: string;
};

/** Splits a single line respecting RFC-4180 quoting. Works for both CSV (,) and TSV (\t). */
function splitLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote inside a quoted field
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === delimiter && !inQuotes) {
            values.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }
    values.push(current.trim());
    return values;
}

function parseCSV(text: string): LeadRow[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // Auto-detect delimiter: if the first line has more tabs than commas, it's TSV
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const delimiter = tabCount > commaCount ? "\t" : ",";

    // Parse header — normalize to field keys via aliases
    const rawHeaders = splitLine(firstLine, delimiter).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const headers = rawHeaders.map(h => COLUMN_ALIASES[h] ?? h);

    return lines.slice(1).map(line => {
        if (!line.trim()) return null; // skip blank lines
        const values = splitLine(line, delimiter);

        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

        // Combine first + last name if split columns present (COLUMN_ALIASES maps these to firstName/lastName)
        const name = row["name"] || [row["firstName"], row["lastName"]].filter(Boolean).join(" ").trim();

        const lead: LeadRow = {
            name,
            linkedinUrl: row["linkedinUrl"] ?? "",
            email: row["email"] || undefined,
            title: row["title"] ?? "",
            company: row["company"] ?? "",
            country: row["country"] || undefined,
            companyNewsEvent: row["companyNewsEvent"] || undefined,
            recentPostSummary: row["recentPostSummary"] || undefined,
            careerTrigger: row["careerTrigger"] || undefined,
            franchiseAngle: row["franchiseAngle"] || undefined,
            yearsInCurrentRole: row["yearsInCurrentRole"] ? parseInt(row["yearsInCurrentRole"], 10) || undefined : undefined,
            _valid: true,
        };

        if (!lead.name) { lead._valid = false; lead._error = "Missing name"; }
        else if (!lead.linkedinUrl) { lead._valid = false; lead._error = "Missing LinkedIn URL"; }

        return lead;
    }).filter((r): r is LeadRow => r !== null && !!(r.name || r.linkedinUrl)); // drop empty rows
}

export function ImportLeadForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState<"manual" | "csv">("manual");
    const [isLoading, setIsLoading] = useState(false);
    const [csvRows, setCsvRows] = useState<LeadRow[]>([]);
    const [batchEvent, setBatchEvent] = useState(""); // shared companyNewsEvent for the batch
    const [batchTrigger, setBatchTrigger] = useState(""); // shared careerTrigger for the batch
    const [importResult, setImportResult] = useState<{ processed: number; failed: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: "",
        linkedinUrl: "",
        title: "",
        company: "",
        companyNewsEvent: "",
        recentPostSummary: "",
        careerTrigger: "",
        franchiseAngle: "",
        yearsInCurrentRole: "" as string | number,
    });

    const handleClose = () => {
        setIsOpen(false);
        setCsvRows([]);
        setBatchEvent("");
        setBatchTrigger("");
        setImportResult(null);
        setTab("manual");
        setFormData({ name: "", linkedinUrl: "", title: "", company: "", companyNewsEvent: "", recentPostSummary: "", careerTrigger: "", franchiseAngle: "", yearsInCurrentRole: "" });
    };

    // ── Manual submit ──────────────────────────────────────────────────────
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([{
                    ...formData,
                    yearsInCurrentRole: formData.yearsInCurrentRole !== "" ? Number(formData.yearsInCurrentRole) : undefined,
                }])
            });
            if (res.ok) {
                handleClose();
                router.refresh();
            } else {
                alert("Failed to import lead.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── CSV file pick ──────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const text = ev.target?.result as string;
            setCsvRows(parseCSV(text));
            setImportResult(null);
        };
        reader.readAsText(file);
    };

    // ── CSV batch submit ───────────────────────────────────────────────────
    const handleCSVSubmit = async () => {
        const validRows = csvRows.filter(r => r._valid);
        if (!validRows.length) return;
        setIsLoading(true);

        // Apply shared batch fields (overrides any existing column value only if field was blank)
        const payload = validRows.map(r => ({
            ...r,
            companyNewsEvent: r.companyNewsEvent || batchEvent || undefined,
            careerTrigger: r.careerTrigger || batchTrigger || undefined,
            _valid: undefined,
            _error: undefined,
        }));

        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                const failed = data.results.filter((r: { success: boolean }) => !r.success).length;
                setImportResult({ processed: data.processed, failed });
                router.refresh();
            } else {
                alert("Import failed — check console.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const validCount = csvRows.filter(r => r._valid).length;
    const invalidCount = csvRows.filter(r => !r._valid).length;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
            >
                <PlusCircle className="w-4 h-4" />
                Import Lead
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>

                        {/* Tab switcher */}
                        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-6 w-fit">
                            <button
                                onClick={() => setTab("manual")}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "manual" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Single Lead
                            </button>
                            <button
                                onClick={() => setTab("csv")}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === "csv" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                <Upload className="w-3.5 h-3.5" />
                                CSV Bulk Upload
                            </button>
                        </div>

                        {/* ── MANUAL TAB ─────────────────────────────────────── */}
                        {tab === "manual" && (
                            <>
                                <h2 className="text-xl font-bold text-slate-800 mb-6">Manually Import Lead</h2>
                                <form onSubmit={handleManualSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                                            <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL <span className="text-red-500">*</span></label>
                                            <input required type="url" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={formData.linkedinUrl} onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                                            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                                        </div>
                                    </div>
                                    <hr className="border-slate-100 my-4" />
                                    <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">Personalization Signals</p>
                                    <p className="text-xs text-slate-400 mb-3">Max 2 signals used per email. Priority A (company event) beats Priority B (post topic).</p>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Company News Event <span className="text-xs text-blue-500 ml-1">Priority A</span>
                                        </label>
                                        <input
                                            placeholder="e.g. WARN filing — 400 layoffs announced Jan 15 | Boeing reorg Q1"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                            value={formData.companyNewsEvent}
                                            onChange={e => setFormData({ ...formData, companyNewsEvent: e.target.value })}
                                        />
                                        <p className="text-xs text-slate-400 mt-1">WARN Act, SEC 8-K departure, M&A, reorg, layoffs. Public macro data only.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Recent Post Topic <span className="text-xs text-slate-400 ml-1">Priority B — paraphrase only, no quotes</span>
                                        </label>
                                        <input
                                            placeholder="e.g. Leadership changes creating operational uncertainty"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                            value={formData.recentPostSummary}
                                            onChange={e => setFormData({ ...formData, recentPostSummary: e.target.value })}
                                        />
                                        <p className="text-xs text-slate-400 mt-1">Topic only — never paste a verbatim quote. 8 words max.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Career Trigger Type</label>
                                        <input
                                            placeholder="e.g. Layoff, Stepped down, OpenToWork badge, Reorg survivor"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                            value={formData.careerTrigger}
                                            onChange={e => setFormData({ ...formData, careerTrigger: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Franchise Angle <span className="text-xs text-slate-400">(internal only)</span></label>
                                        <input
                                            placeholder="e.g. Wants equity, autonomy-driven, risk-averse"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                            value={formData.franchiseAngle}
                                            onChange={e => setFormData({ ...formData, franchiseAngle: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Years in Current Role <span className="text-xs text-slate-400 ml-1">(optional — from Sales Nav, scoring signal only)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            placeholder="e.g. 9"
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                            value={formData.yearsInCurrentRole}
                                            onChange={e => setFormData({ ...formData, yearsInCurrentRole: e.target.value })}
                                        />
                                        <p className="text-xs text-slate-400 mt-1">8+ years adds +7 to lead score. Never referenced in the email.</p>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={handleClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                                        <button type="submit" disabled={isLoading} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
                                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Save & Trigger AI
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {/* ── CSV TAB ────────────────────────────────────────── */}
                        {tab === "csv" && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">CSV Bulk Upload</h2>
                                    <p className="text-sm text-slate-500 mt-1">Export from Sales Navigator → upload here. Required columns: <code className="bg-slate-100 px-1 rounded text-xs">Name</code> and <code className="bg-slate-100 px-1 rounded text-xs">LinkedIn URL</code>.</p>
                                </div>

                                {/* File drop zone */}
                                <div
                                    onClick={() => fileRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                                >
                                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500">Click to upload <span className="font-medium text-slate-700">.csv</span> from Sales Navigator</p>
                                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                                </div>

                                {/* Shared batch fields — apply to all rows */}
                                {csvRows.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Apply to all {validCount} leads in this batch</p>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Company News Event <span className="text-xs text-blue-500 ml-1">Priority A — fills any blank rows</span>
                                            </label>
                                            <input
                                                placeholder="e.g. WARN filing — 400 layoffs, Boeing, announced March 2026"
                                                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                                                value={batchEvent}
                                                onChange={e => setBatchEvent(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Career Trigger Type <span className="text-xs text-slate-400 ml-1">fills any blank rows</span></label>
                                            <input
                                                placeholder="e.g. Layoff, Reorg survivor"
                                                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                                                value={batchTrigger}
                                                onChange={e => setBatchTrigger(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Preview table */}
                                {csvRows.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                                                <CheckCircle2 className="w-4 h-4" /> {validCount} ready
                                            </span>
                                            {invalidCount > 0 && (
                                                <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
                                                    <AlertCircle className="w-4 h-4" /> {invalidCount} will be skipped
                                                </span>
                                            )}
                                        </div>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                                    <tr>
                                                        <th className="text-left px-3 py-2">Name</th>
                                                        <th className="text-left px-3 py-2">Title</th>
                                                        <th className="text-left px-3 py-2">Company</th>
                                                        <th className="text-left px-3 py-2">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {csvRows.slice(0, 25).map((row, i) => (
                                                        <tr key={i} className={`border-t border-slate-100 ${!row._valid ? "opacity-50" : ""}`}>
                                                            <td className="px-3 py-2 font-medium text-slate-800">{row.name || "—"}</td>
                                                            <td className="px-3 py-2 text-slate-600">{row.title || "—"}</td>
                                                            <td className="px-3 py-2 text-slate-600">{row.company || "—"}</td>
                                                            <td className="px-3 py-2">
                                                                {row._valid
                                                                    ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>
                                                                    : <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {row._error}</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {csvRows.length > 25 && (
                                                <p className="text-xs text-slate-400 text-center py-2 border-t border-slate-100">
                                                    + {csvRows.length - 25} more rows (all will be imported)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Success state */}
                                {importResult && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                                        <p className="font-semibold">✅ Import complete</p>
                                        <p>{importResult.processed - importResult.failed} leads imported and pipeline triggered.{importResult.failed > 0 ? ` ${importResult.failed} failed validation.` : ""}</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={handleClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">
                                        {importResult ? "Close" : "Cancel"}
                                    </button>
                                    {!importResult && validCount > 0 && (
                                        <button
                                            onClick={handleCSVSubmit}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            Import {validCount} Lead{validCount !== 1 ? "s" : ""} & Trigger AI
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
