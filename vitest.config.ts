import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Auth-gate tests are pure: no database, no global setup, no Next server.
// (The match-workspace branch has its own config with a Postgres globalSetup; keeping this one
// DB-free means `npm run test:auth` runs anywhere, including CI with no database.)
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
