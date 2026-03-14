import { NextResponse } from "next/server";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1nUQaiUoZ6yB67O5U2DgR07If1GBUf9vSGbFTJKLhlM4/export?format=csv";

function parseCSV(csv: string): string[] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.replace(/^"|"$/g, "").trim())
    .filter((line) => line.length > 0);
}

export async function GET() {
  try {
    const res = await fetch(SHEET_CSV_URL, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ cities: [], error: "Failed to fetch sheet" }, { status: 502 });
    }
    const csv = await res.text();
    const cities = parseCSV(csv);
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ cities: [], error: "Internal error" }, { status: 500 });
  }
}
