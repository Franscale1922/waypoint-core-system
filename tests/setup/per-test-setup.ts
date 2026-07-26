/**
 * Per-test-file setup (Vitest `setupFiles`). Registers a beforeEach that truncates all
 * 8 match-workspace tables so every test starts from an empty, isolated state, and
 * disconnects the shared client after the file completes.
 *
 * Safe because file-level parallelism is disabled in vitest.config.ts — no two test
 * files run concurrently against the one shared local test DB, so a beforeEach TRUNCATE
 * can never wipe another file's in-flight rows.
 */
import { beforeEach, afterAll } from "vitest";
import { prisma, truncateAll } from "./test-db";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});
