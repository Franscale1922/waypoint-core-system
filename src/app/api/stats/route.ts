import { NextResponse } from "next/server";
import { google } from "googleapis";

// Cache the result for 1 hour via Next.js route segment config
export const revalidate = 3600;

export async function GET() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
    // Column header to use for counting distinct states (default: "State")
    const stateColumnHeader = process.env.GOOGLE_SHEETS_STATE_COLUMN ?? "State";

    if (!spreadsheetId || !clientEmail || !privateKey) {
      // Fall back to hardcoded values if env vars not yet configured
      return NextResponse.json({ ownersHelped: 146, statesServed: 35 });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 1. Get the first sheet's data (all rows, first 50 columns)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A1:AZ",
    });

    const rows = response.data.values ?? [];
    if (rows.length < 2) {
      // Only headers or empty — fall back
      return NextResponse.json({ ownersHelped: 146, statesServed: 35 });
    }

    const headers = rows[0].map((h: string) => String(h).trim());
    const dataRows = rows.slice(1).filter((r) => r.some((cell: string) => cell !== ""));

    // Total owners helped = number of data rows
    const ownersHelped = dataRows.length;

    // Distinct states = unique non-empty values in the state column
    const stateColIndex = headers.findIndex(
      (h: string) => h.toLowerCase() === stateColumnHeader.toLowerCase()
    );

    let statesServed = 35; // fallback if column not found
    if (stateColIndex !== -1) {
      const stateValues = dataRows
        .map((r) => String(r[stateColIndex] ?? "").trim())
        .filter(Boolean);
      statesServed = new Set(stateValues).size;
    }

    return NextResponse.json({ ownersHelped, statesServed });
  } catch (err) {
    console.error("[/api/stats] Google Sheets error:", err);
    // Graceful fallback — never break the homepage
    return NextResponse.json({ ownersHelped: 146, statesServed: 35 });
  }
}
