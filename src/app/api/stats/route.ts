import { NextResponse } from "next/server";

export const revalidate = 3600; // re-fetch at most once per hour

// Public CSV export of the franchise map / owners sheet
// Same sheet that powers the homepage map — no auth required
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1nUQaiUoZ6yB67O5U2DgR07If1GBUf9vSGbFTJKLhlM4/export?format=csv";

// Fallback values (true historical count) used if fetch fails
const FALLBACK = { ownersHelped: 146, statesServed: 35 };

/**
 * Parse a CSV string into an array of row arrays.
 * Handles quoted fields and CRLF/LF line endings.
 */
function parseCSVRows(csv: string): string[][] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

export async function GET() {
  try {
    const res = await fetch(SHEET_CSV_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json(FALLBACK);

    const csv = await res.text();
    const rows = parseCSVRows(csv);

    if (rows.length < 2) return NextResponse.json(FALLBACK);

    const headers = rows[0].map((h) => h.toLowerCase());
    const dataRows = rows.slice(1);

    // Count total owners = number of data rows
    const ownersHelped = dataRows.length;

    // Try to find a "state" column — if found, count distinct values
    // Falls back to FALLBACK.statesServed if no state column exists
    const stateColIndex = headers.findIndex((h) =>
      ["state", "st", "state/province", "province"].includes(h)
    );

    const statesServed =
      stateColIndex !== -1
        ? new Set(
            dataRows
              .map((r) => (r[stateColIndex] ?? "").trim())
              .filter(Boolean)
          ).size
        : FALLBACK.statesServed;

    return NextResponse.json({ ownersHelped, statesServed });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
