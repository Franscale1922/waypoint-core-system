/**
 * Shared PrismaClient for the match-workspace test suite, bound EXPLICITLY to the
 * validated local test database. It never relies on the ambient POSTGRES_PRISMA_URL
 * (which points at prod in .env.local), so there is no path by which a test reaches
 * production — the URL is resolved through resolveAndAssertTestUrl() first.
 */
import { PrismaClient } from "@prisma/client";
import { resolveAndAssertTestUrl, MATCH_WORKSPACE_TABLES } from "./assert-test-db";

const testUrl = resolveAndAssertTestUrl();

export const prisma = new PrismaClient({
  datasources: { db: { url: testUrl } },
});

/** Truncate all 8 match-workspace tables in one statement (CASCADE clears relations). */
export async function truncateAll(): Promise<void> {
  const quoted = MATCH_WORKSPACE_TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

export { MATCH_WORKSPACE_TABLES };
