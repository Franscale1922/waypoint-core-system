import { NextResponse } from "next/server";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1olep7m7ZjCu_jpePBqEqMZo2rWyoiCo_RIzTlX3Hleo/export?format=csv";

/**
 * Extract the first column from a CSV line, handling quoted fields.
 * Supports both single-column (legacy) and two-column (City | State) formats.
 * e.g. `"Alpharetta, GA",GA` → `Alpharetta, GA`
 *      `Nashville, TN`        → `Nashville, TN`
 */
function extractFirstColumn(line: string): string {
  if (line.startsWith('"')) {
    const closeQuote = line.indexOf('"', 1);
    return closeQuote >= 0 ? line.slice(1, closeQuote).trim() : line.slice(1).trim();
  }
  // Unquoted — return the whole line (single-column, no internal commas)
  return line.trim();
}

export async function GET() {
  try {
    const res = await fetch(SHEET_CSV_URL, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ cities: [], error: "Failed to fetch sheet" }, { status: 502 });
    }
    const csv = await res.text();
    const cities = csv
      .split(/\r?\n/)
      .map(extractFirstColumn)
      .filter((city) => city.length > 0 && city.toLowerCase() !== "city"); // skip header row
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ cities: [], error: "Internal error" }, { status: 500 });
  }
}
