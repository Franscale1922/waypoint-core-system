import { beforeEach, afterEach, vi } from "vitest";
import { createHash } from "crypto";

/**
 * The fake Git Data API, shared by every suite that drives commitRefreshedArticles.
 *
 * Extracted from tests/unit/write-path-dates.test.ts rather than copied. A second hand-rolled fake
 * is a second model of the same API, and the copy that drifts is the one nobody is looking at: a
 * stub that answers an endpoint with the wrong SHAPE does not fail honestly, it fails as a
 * confusing TypeError inside production code. One fake, imported by all of them.
 *
 * Not named *.test.ts on purpose: the unit project collects tests by that suffix, so a helper
 * carrying no tests would otherwise be reported as an empty suite.
 */

/** The day these suites pin the clock to, so a batch identifier is stable across runs. */
export const TODAY = "2026-08-04";

// ─── A fake Git Data API ──────────────────────────────────────────────────────

export const OWNER = "Franscale1922";
export const REPO = "waypoint-core-system";

export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export function jsonResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

/**
 * A small, STATEFUL stand-in for the Git Data API.
 *
 * A flat stub cannot express the thing under test. The double-commit bug is a property of two runs
 * against one server: attempt one advances the branch, attempt two has to notice. So this keeps
 * real state — blobs, trees, commits, a branch pointer — and, critically, addresses trees BY
 * CONTENT the way Git does, so laying a blob that is already present over a base tree returns the
 * base tree's own SHA. That is what the production code's "would this commit change anything"
 * check reads, and modelling it here is what makes that test mean something.
 *
 * Commit SHAs are a counter, not a content hash, deliberately: a real second commit of identical
 * content gets a different SHA (its timestamp and parent differ), and the counter reproduces that.
 * `createdCommits` is therefore the number the retry tests are really about.
 */
export function createFakeGitHub(initialFiles: Record<string, string> = {}) {
  const blobs = new Map<string, string>();
  const trees = new Map<string, Record<string, string>>();
  const commits = new Map<string, { tree: string; message: string; parents: string[] }>();

  const treeShaOf = (entries: Record<string, string>) =>
    `tree-${shortHash(Object.keys(entries).sort().map((p) => `${p}:${entries[p]}`).join("\n"))}`;

  const baseEntries: Record<string, string> = {};
  for (const [path, content] of Object.entries(initialFiles)) {
    const sha = `blob-${shortHash(content)}`;
    blobs.set(sha, content);
    baseEntries[path] = sha;
  }
  const baseTree = treeShaOf(baseEntries);
  trees.set(baseTree, baseEntries);
  commits.set("commit-base", { tree: baseTree, message: "base commit", parents: [] });

  let head = "commit-base";
  let commitSeq = 0;

  async function handle(url: string | URL, init: RequestInit = {}): Promise<Response> {
    const parsed = new URL(String(url));
    const path = parsed.pathname.replace(`/repos/${OWNER}/${REPO}`, "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;

    if (method === "GET" && path.startsWith("/git/ref/heads/")) {
      return jsonResponse(200, { object: { sha: head } });
    }

    if (method === "GET" && path === "/commits") {
      const from = parsed.searchParams.get("sha") ?? head;
      const limit = Number(parsed.searchParams.get("per_page") ?? "30");
      const out: { sha: string; commit: { message: string } }[] = [];
      let cursor: string | undefined = from;
      while (cursor && out.length < limit) {
        const commit: { tree: string; message: string; parents: string[] } | undefined =
          commits.get(cursor);
        if (!commit) break;
        out.push({ sha: cursor, commit: { message: commit.message } });
        cursor = commit.parents[0];
      }
      return jsonResponse(200, out);
    }

    if (method === "GET" && path.startsWith("/git/commits/")) {
      const sha = path.slice("/git/commits/".length);
      const commit = commits.get(sha);
      if (!commit) return jsonResponse(404, { message: "Not Found" });
      return jsonResponse(200, { sha, tree: { sha: commit.tree } });
    }

    if (method === "POST" && path === "/git/blobs") {
      const content = Buffer.from(body.content, "base64").toString("utf-8");
      const sha = `blob-${shortHash(content)}`;
      blobs.set(sha, content);
      return jsonResponse(201, { sha });
    }

    if (method === "POST" && path === "/git/trees") {
      const entries = { ...(trees.get(body.base_tree) ?? {}) };
      for (const entry of body.tree) entries[entry.path] = entry.sha;
      const sha = treeShaOf(entries);
      trees.set(sha, entries);
      return jsonResponse(201, { sha });
    }

    if (method === "POST" && path === "/git/commits") {
      const sha = `commit-${++commitSeq}`;
      commits.set(sha, { tree: body.tree, message: body.message, parents: body.parents });
      return jsonResponse(201, { sha });
    }

    if (method === "PATCH" && path.startsWith("/git/refs/heads/")) {
      head = body.sha;
      return jsonResponse(200, { object: { sha: head } });
    }

    throw new Error(`fake GitHub: unhandled ${method} ${path}`);
  }

  return {
    handle,
    get head() { return head; },
    /** How many commit OBJECTS were created. The retry tests exist to keep this at 1. */
    get createdCommits() { return commitSeq; },
    messageOf: (sha: string) => commits.get(sha)?.message,
    fileAt: (commitSha: string, path: string) => {
      const commit = commits.get(commitSha);
      const entries = commit ? trees.get(commit.tree) ?? {} : {};
      const blobSha = entries[path];
      return blobSha === undefined ? undefined : blobs.get(blobSha);
    },
  };
}

export type FakeGitHub = ReturnType<typeof createFakeGitHub>;

export const methodOf = (init?: RequestInit) => init?.method ?? "GET";
export const pathOf = (url: unknown) => new URL(String(url)).pathname;

/** Shared env + module hygiene for every block that drives commitRefreshedArticles. */
export function useGitHubEnv() {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = OWNER;
    process.env.GITHUB_REPO_NAME = REPO;
    process.env.GITHUB_BRANCH = "main";
    // The stamped date is part of the committed bytes and therefore part of the batch identifier.
    // Pinning the clock is what lets a test assert that two runs derive the SAME id — the real
    // property, which a test straddling midnight would flake on.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("@/lib/frontmatterDates.mjs");
  });
}
