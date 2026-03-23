import { NextResponse } from "next/server";

export const revalidate = 3600;

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1nUQaiUoZ6yB67O5U2DgR07If1GBUf9vSGbFTJKLhlM4/export?format=csv";

const FALLBACK = { ownersHelped: 146, statesServed: 35 };

/** Split a CSV line into cells, respecting quoted fields */
function splitCSVLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { cells.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}


export async function GET() {
  try {
    const res = await fetch(SHEET_CSV_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json(FALLBACK);

    const csv = await res.text();
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) return NextResponse.json(FALLBACK);

    const headers = splitCSVLine(lines[0]).map((h: string) => h.toLowerCase());
    const dataRows = lines.slice(1).map((l) => splitCSVLine(l));

    // Total owners = number of data rows
    const ownersHelped = dataRows.length;

    // Find the "state" column and count distinct values
    const stateColIndex = headers.findIndex((h: string) =>
      ["state", "st", "state/province", "province"].includes(h)
    );

    const statesServed =
      stateColIndex !== -1
        ? new Set(
            dataRows
              .map((r: string[]) => (r[stateColIndex] ?? "").trim().toUpperCase())
              .filter(Boolean)
          ).size
        : FALLBACK.statesServed;

    return NextResponse.json({ ownersHelped, statesServed });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
