#!/usr/bin/env node
/**
 * verify-pushed-tree.mjs
 *
 * Runs the pre-push gate against the COMMITS BEING PUSHED, not against the
 * working tree.
 *
 * The bug this exists to close (found by a Codex round-2 review 2026-08-03,
 * reproduced end-to-end 2026-08-04): .githooks/pre-push read the mutable
 * working copy. Commit an em dash, remove it in the working tree without
 * committing, and the audit read the clean file, printed
 * "PASS Section 11: 0 em dashes", exited 0, and git pushed the bad blob. The
 * gate reported green on content that was not what was being pushed. The hook
 * never read its stdin at all, so it could not have known which commits were
 * in flight; this is a property of the hook, and it applied to all three
 * checks equally.
 *
 * Shape: for each pushed tip, extract that commit's tree into a temp dir and
 * run the checks there. Deliberately NOT `git stash` -- a stash that fails
 * mid-way can lose uncommitted work, which is a worse failure than the one
 * being fixed. Nothing here ever writes to the working tree.
 *
 * Invoked by .githooks/pre-push with one argument per distinct non-deletion
 * SHA. Usage:  node scripts/verify-pushed-tree.mjs <sha> [<sha> ...]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// The repo this script was installed into. Used only to locate node_modules;
// git operations run against the pushing worktree (process.cwd()), which is
// where git puts us and which always has the SHA in its object store.
const INSTALLED_ROOT = path.join(HERE, "..");

const TMP_PREFIX = "waypoint-prepush-";

// The repo tracks ~989MB of franchisor PDFs under brands/. No check reads
// them, and including them turns a 145ms extraction into 2.6s. Excluding a
// path that does not exist in a given commit is not an error for git archive
// (pure exclusion pathspecs do not require a match), so this is safe on old
// commits too. A POSITIVE pathspec would fail there, which is why there is
// none.
const EXCLUDED_TOP = "brands";

// Orphaned temp dirs older than this get swept on the next run. An EXIT
// handler cannot fire on SIGKILL, so garbage is possible and must be bounded.
const STALE_MS = 6 * 60 * 60 * 1000;

// Inputs every check needs, asserted present BEFORE any check runs.
//
// This is the guard that makes a vacuous pass impossible, and it is not
// hypothetical: three of aeo-audit's four checks degrade SILENTLY to PASS when
// their input directory is absent (existsSync guards at aeo-audit.mjs:110, 153
// and 238). Measured: extracting only content/ and running the audit prints
// "PASS Section 11: 0 em dashes in articles or src/" across 0 files, exit 0.
// This repo has already shipped that exact failure once, in verify-links.
const REQUIRED_PATHS = [
  "content/articles",
  "src/app",
  "src/data",
  "src/lib/match-workspace",
  "scripts",
  "tests/unit",
  "tests/auth",
  "prisma/schema.prisma",
  "vitest.config.ts",
  "package.json",
];

/** spawnSync with stdin closed, output captured. */
function capture(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
}

/** spawnSync with stdin closed, output streamed straight to the user. */
function stream(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    stdio: ["ignore", "inherit", "inherit"],
    ...opts,
  });
}

/**
 * A child "succeeded" only if it ran, was not killed, and exited 0. Checking
 * status alone is not enough: a child that never spawned has status null.
 */
function succeeded(r) {
  return r.error === undefined && r.signal === null && r.status === 0;
}

function describeFailure(r) {
  if (r.error) return `could not run (${r.error.message})`;
  if (r.signal) return `killed by ${r.signal}`;
  return `exit ${r.status}`;
}

function blocked(lines) {
  console.error("");
  console.error("PUSH BLOCKED: " + lines[0]);
  for (const line of lines.slice(1)) console.error("  " + line);
  return false;
}

/**
 * Delete a work dir. Deletes ONLY the exact string mkdtempSync returned --
 * never a path this code assembled, never with a trailing separator, never a
 * glob. The prefix assertion is a second, independent line of defence against
 * the classic `rm -rf "$EMPTY"/` failure.
 */
function removeWorkdir(dir) {
  if (typeof dir !== "string" || dir === "") return;
  if (!path.basename(dir).startsWith(TMP_PREFIX)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort: the sweep below is the backstop */
  }
}

function sweepStaleWorkdirs() {
  let base;
  try {
    base = fs.realpathSync(os.tmpdir());
  } catch {
    return;
  }
  const cutoff = Date.now() - STALE_MS;
  let names = [];
  try {
    names = fs.readdirSync(base);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.startsWith(TMP_PREFIX)) continue;
    const full = path.join(base, name);
    try {
      if (fs.statSync(full).mtimeMs < cutoff) {
        fs.rmSync(full, { recursive: true, force: true });
      }
    } catch {
      /* another run may have removed it already */
    }
  }
}

/** Count regular files and symlinks, matching what `git ls-tree -r` enumerates. */
function countEntries(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countEntries(full);
    else if (entry.isFile() || entry.isSymbolicLink()) n += 1;
  }
  return n;
}

/**
 * How many paths the commit should yield once brands/ is dropped.
 *
 * `git ls-tree` does NOT accept :(exclude) pathspec magic -- it fails with
 * "pathspec magic not supported by this command" and, piped to wc, would
 * quietly report 0. So the exclusion is applied here instead. -z because a
 * tracked filename may legitimately contain a newline.
 */
function expectedEntryCount(sha, cwd) {
  const r = capture("git", ["ls-tree", "-r", "--name-only", "-z", sha], { cwd });
  if (!succeeded(r)) return null;
  return r.stdout
    .split("\0")
    .filter(Boolean)
    .filter((p) => p !== EXCLUDED_TOP && !p.startsWith(EXCLUDED_TOP + "/")).length;
}

function locateNodeModules(cwd) {
  for (const base of [INSTALLED_ROOT, cwd]) {
    const dir = path.join(base, "node_modules");
    if (fs.existsSync(path.join(dir, ".bin", "vitest"))) return dir;
  }
  return null;
}

/** Extract one commit's tree. Returns the tree dir, or null after reporting. */
function extractTree(sha, work, cwd) {
  const tree = path.join(work, "tree");
  // The tarball lives OUTSIDE the tree dir so it cannot be miscounted as a
  // tracked file by the count guard below.
  const tarball = path.join(work, "pushed.tar");
  fs.mkdirSync(tree);

  // Two separate calls, never a shell pipeline. Measured: a pipeline reports
  // only the LAST command's status, and bsdtar accepts an empty archive, so
  // `git archive <bad-sha> | tar -x` exits 0 having extracted nothing. That is
  // a vacuous-pass generator, and it is exactly how this gate would fail open
  // again.
  const archived = capture(
    "git",
    ["archive", "--output", tarball, sha, "--", `:(exclude)${EXCLUDED_TOP}`],
    { cwd },
  );
  if (!succeeded(archived)) {
    blocked([
      `could not read the tree of ${sha} (${describeFailure(archived)}).`,
      (archived.stderr || "").trim() || "git archive produced no diagnostics.",
      "The push was stopped because the gate could not verify what it would send.",
    ]);
    return null;
  }

  const extracted = capture("tar", ["-xf", tarball, "-C", tree]);
  if (!succeeded(extracted)) {
    blocked([
      `could not unpack the tree of ${sha} (${describeFailure(extracted)}).`,
      (extracted.stderr || "").trim() || "tar produced no diagnostics.",
    ]);
    return null;
  }

  const expected = expectedEntryCount(sha, cwd);
  if (expected === null) {
    blocked([`could not list the tree of ${sha} to verify the extraction.`]);
    return null;
  }
  const actual = countEntries(tree);
  if (actual !== expected) {
    blocked([
      `the extracted tree of ${sha} is incomplete.`,
      `git lists ${expected} paths (excluding ${EXCLUDED_TOP}/) but ${actual} were extracted.`,
      "Refusing to run the checks: a partial tree makes them pass vacuously",
      "rather than fail, which is worse than not running them at all.",
    ]);
    return null;
  }

  const missing = REQUIRED_PATHS.filter((rel) => !fs.existsSync(path.join(tree, rel)));
  if (missing.length > 0) {
    blocked([
      `${sha} does not contain everything the checks need.`,
      `Missing: ${missing.join(", ")}`,
      "This usually means an old commit predating these paths is being pushed.",
      "The checks cannot judge it, and silently passing it would be a false green.",
      "Push it with SKIP_ARCHIVE_VERIFY=1 if you have verified it another way.",
    ]);
    return null;
  }

  fs.rmSync(tarball, { force: true });
  console.log(`  extracted ${actual} files`);
  return tree;
}

/** Run the three checks inside an extracted tree. Returns true when all pass. */
function runChecks(tree, cwd) {
  const env = { ...process.env };

  // 1. Content audit. aeo-audit.mjs resolves every path from CWD (content/
  //    articles at :19, src/app at :124, src at :150, src/data at :237) and has
  //    no npm dependencies, so the extracted copy run from the extracted tree
  //    audits exactly that tree.
  const audit = stream("node", [path.join(tree, "scripts", "aeo-audit.mjs")], { cwd: tree, env });
  if (!succeeded(audit)) {
    return blocked([
      `content audit failed for the pushed tree (${describeFailure(audit)}). Common causes:`,
      "em dashes (CONTENT-STANDARDS section 11): remove them, or mark a",
      "  genuinely-functional one with the token: emdash-allow",
      "a metaTitle / article frontmatter title that hard-codes the brand",
      "  (the title template already appends it): remove the brand suffix",
      "",
      "Note these are read from the COMMIT, not your working tree. Fixing the",
      "file without committing the fix will not clear this.",
    ]);
  }

  // 2. Brand-identity map drift. Unlike aeo-audit, build-brand-map.mjs derives
  //    its root from its own location (:56), so changing directory does NOT
  //    redirect it. The extracted copy must be the one invoked, or it would
  //    compare the INSTALLED repo's map and silently validate the wrong tree.
  //    Its registry source is an absolute homedir()/BIP_REGISTRY_PATH path to a
  //    sibling repo, correctly unaffected by any of this.
  if (env.SKIP_BIP_DRIFT !== "1") {
    const drift = capture("node", [path.join(tree, "scripts", "build-brand-map.mjs"), "--check"], {
      cwd: tree,
      env,
    });
    const driftOutput = `${drift.stdout || ""}${drift.stderr || ""}`;
    if (!succeeded(drift)) {
      console.error(driftOutput);
      return blocked([
        "the committed brand-identity map is stale or unverifiable.",
        "Regenerate and review the diff:  node scripts/build-brand-map.mjs",
        "Genuinely need to skip?          SKIP_BIP_DRIFT=1 git push",
      ]);
    }
    // Quiet when green, everything when not. Green-because-skipped still has to
    // be visible, or the skip is a lie.
    if (driftOutput.includes("BRAND_MAP_DRIFT_SKIPPED")) process.stdout.write(driftOutput);
  }

  // 3. Fast unit suites. The only check needing node_modules, which a bare
  //    extraction has none of, so the installed repo's is symlinked in. Vitest
  //    writes one results.json into that shared cache (a rerun-ordering hint,
  //    not correctness state, regenerated when malformed); nothing else in the
  //    real repo is touched.
  if (env.SKIP_UNIT_TESTS === "1") return true;

  const nodeModules = locateNodeModules(cwd);
  if (nodeModules === null) {
    console.log("NOTE: vitest not installed, skipping unit suites. Run 'npm install' to enable them.");
    return true;
  }
  const link = path.join(tree, "node_modules");
  if (!fs.existsSync(link)) fs.symlinkSync(nodeModules, link, "dir");

  const tests = stream(path.join(nodeModules, ".bin", "vitest"), ["run", "--project", "unit", "--project", "auth"], {
    cwd: tree,
    env,
  });
  if (!succeeded(tests)) {
    return blocked([
      `unit tests failed for the pushed tree (${describeFailure(tests)}).`,
      "Run them directly:  npm run test:unit && npm run test:auth",
      "Genuinely need to skip?  SKIP_UNIT_TESTS=1 git push",
    ]);
  }
  return true;
}

// The work dir of the run in flight. Tracked so an interrupt can remove it:
// the stale sweep deliberately skips young directories, so it would leave
// exactly the one we just created.
let activeWorkdir = null;

function verifyOne(sha, cwd) {
  let work;
  try {
    // realpath FIRST: on macOS tmpdir() is /var/..., a symlink to /private/var,
    // and Node normalises to the private form, so an unresolved path would make
    // later comparisons disagree with themselves.
    work = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), TMP_PREFIX));
  } catch (err) {
    return blocked([`could not create a temporary directory to verify ${sha} (${err.message}).`]);
  }
  activeWorkdir = work;
  try {
    const tree = extractTree(sha, work, cwd);
    if (tree === null) return false;
    return runChecks(tree, cwd);
  } finally {
    removeWorkdir(work);
    activeWorkdir = null;
  }
}

function main() {
  const shas = process.argv.slice(2).filter(Boolean);
  if (shas.length === 0) {
    // Not treated as success. A delete-only push has nothing to verify, but
    // that decision belongs to the hook, which simply does not call this. Zero
    // arguments here means something went wrong upstream, and failing closed is
    // the only safe reading.
    console.error("usage: verify-pushed-tree.mjs <sha> [<sha> ...]");
    console.error("Refusing to report success without having verified anything.");
    process.exit(2);
  }

  sweepStaleWorkdirs();

  const cwd = process.cwd();
  const plural = shas.length === 1 ? "commit" : "commits";
  console.log(`Verifying ${shas.length} pushed ${plural} against ${shas.length === 1 ? "its" : "their"} own tree.`);

  for (const sha of shas) {
    console.log(`\n[${sha.slice(0, 12)}]`);
    if (!verifyOne(sha, cwd)) process.exit(1);
  }
  process.exit(0);
}

// rmSync is synchronous, so cleanup completes before exiting. Without this,
// interrupting a push leaves the work dir behind until the next sweep, and the
// sweep will not touch it for hours because it is young.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    removeWorkdir(activeWorkdir);
    process.exit(130);
  });
}

main();
