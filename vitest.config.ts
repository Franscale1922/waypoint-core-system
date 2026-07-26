import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const srcAlias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Two suites with genuinely different needs, so they are separate projects:
//
//   auth             pure unit tests (allowlist, withAdmin, route coverage). NO database, no
//                    global setup. Must stay runnable anywhere, including a machine or CI box
//                    with no Postgres.
//   match-workspace  integration tests against a REAL local Postgres (enums and @@unique need a
//                    real DB, not a mock). File parallelism is OFF because every file shares the
//                    one local `waypoint_test` database and truncates in beforeEach, so
//                    concurrent files would race those truncations.
//
// Run one: `npm run test:auth` / `npm run test:match-workspace`. Run both: `npx vitest run`.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: srcAlias },
        test: {
          name: "auth",
          environment: "node",
          include: ["tests/auth/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: srcAlias },
        test: {
          name: "match-workspace",
          environment: "node",
          include: ["tests/match-workspace/**/*.test.ts"],
          globalSetup: ["./tests/setup/global-setup.ts"],
          setupFiles: ["./tests/setup/per-test-setup.ts"],
          fileParallelism: false,
          hookTimeout: 60_000, // `prisma db push` in global setup can take a few seconds
          testTimeout: 30_000,
        },
      },
    ],
  },
});
