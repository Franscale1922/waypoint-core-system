/**
 * Export Re-Engagement Leads for Instantly Upload
 *
 * Queries the Neon DB for all SENT leads that:
 *   - Have no Reply record (never replied)
 *   - Were sent more than 5 days ago
 *   - Are not SUPPRESSED or BOOKED
 *
 * Outputs a CSV to stdout (redirect to file for Instantly import).
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/export-reengagement-leads.ts > reengagement_leads.csv
 *
 * The CSV format matches Instantly's bulk upload column headers.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    // Find all SENT leads with no replies, sent more than 5 days ago
    const leads = await (prisma as any).lead.findMany({
        where: {
            status: "SENT",
            sentAt: { not: null, lte: fiveDaysAgo },
        },
        select: {
            id: true,
            name: true,
            email: true,
            company: true,
            title: true,
            score: true,
            sentAt: true,
        },
        orderBy: { score: "desc" },
    });

    // Filter to leads with no Reply records
    const leadIds = leads.map((l: any) => l.id);
    const repliedLeadIds = await (prisma as any).reply.findMany({
        where: { leadId: { in: leadIds } },
        select: { leadId: true },
    });
    const repliedSet = new Set(repliedLeadIds.map((r: any) => r.leadId));

    const eligibleLeads = leads.filter((l: any) => !repliedSet.has(l.id));

    if (eligibleLeads.length === 0) {
        console.error("No eligible leads found.");
        process.exit(0);
    }

    // Build CSV
    const rows: string[] = [
        // Instantly bulk upload column headers
        "Email,First Name,Last Name,Company Name",
    ];

    for (const lead of eligibleLeads) {
        const nameParts = (lead.name ?? "").trim().split(/\s+/);
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ");
        const company = (lead.company ?? "").replace(/,/g, " "); // strip commas for CSV safety
        const email = (lead.email ?? "").toLowerCase().trim();

        if (!email) continue;

        rows.push(`${email},${firstName},${lastName},${company}`);
    }

    const csv = rows.join("\n");

    // Write to file
    const outputPath = path.join(process.cwd(), "reengagement_leads.csv");
    fs.writeFileSync(outputPath, csv, "utf8");

    // Summary to stderr so it doesn't pollute the CSV on stdout
    const msg = [
        ``,
        `Re-engagement export complete`,
        `  Total SENT leads checked : ${leads.length}`,
        `  Leads with replies (skip) : ${repliedSet.size}`,
        `  Eligible for re-engagement: ${eligibleLeads.length}`,
        `  Output file               : ${outputPath}`,
        ``,
        `Next steps:`,
        `  1. Open Instantly dashboard`,
        `  2. Create a new campaign: "Waypoint Re-Engagement — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}"`,
        `  3. Upload reengagement_leads.csv as the contact list`,
        `  4. Use the Step 2 guide offer template as the first (and only) step`,
        `  5. Set schedule: Mon-Fri, 8 AM - 5 PM MT, daily cap 35`,
        `  6. Launch and monitor`,
        ``,
    ].join("\n");

    process.stderr.write(msg);
    process.exit(0);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
