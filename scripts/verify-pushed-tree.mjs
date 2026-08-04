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
 * in flight; this is a property of the hook, and it applied to every
 * check equally.
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

// Upper bound on how many newly-added commits get verified individually. A
// stale remote-tracking ref can make an ordinary push look like it introduces
// hundreds of commits; past this the tip alone is checked and that is said out
// loud rather than assumed.
const MAX_RANGE = 25;

// Inputs every check needs, asserted present BEFORE any check runs.
//
// Why this still earns its place, stated accurately as of 2026-08-04. It was
// written when aeo-audit degraded SILENTLY to PASS on a missing input
// directory: extracting only content/ printed "PASS Section 11: 0 em dashes"
// across 0 files and exited 0. PR #23 (40f4087) fixed that in the audit itself,
// which now reports "FAIL: N audit input path(s) missing" and exits 1
// (re-measured here, not assumed).
//
// So this list is no longer the only thing standing between us and that
// particular vacuous pass. It is kept because it covers what the audit does not
// (tests/unit, tests/auth, prisma/schema.prisma, vitest.config.ts,
// package.json), because it fails before any checker runs rather than relying
// on each one to police its own inputs, and because it turns an old commit that
// predates these paths into a clear message instead of a stack trace. Two
// overlapping guards on the failure mode this repo has already shipped once
// (verify-links) is the intended amount, not an accident.
const REQUIRED_PATHS = [
  "content/articles",
  "src/app",
  "src/data",
  "src/lib/match-workspace",
  "scripts/aeo-audit.mjs",
  "scripts/verify-dates.mjs",
  "scripts/build-brand-map.mjs",
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

/**
 * Symlinks in the extracted tree whose target escapes the extraction root.
 *
 * Directory entries are classified with lstat semantics, so a symlink to a
 * directory is never descended into and this cannot loop. Links that stay
 * inside the tree are left alone: they describe the pushed content honestly.
 */
function escapingSymlinks(root) {
  const escaping = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        const target = path.resolve(dir, fs.readlinkSync(full));
        if (target !== root && !target.startsWith(root + path.sep)) {
          escaping.push(path.relative(root, full));
        }
      } else if (entry.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(root);
  return escaping;
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

/**
 * The node_modules to lend the extracted tree.
 *
 * Keyed on the directory existing, NOT on vitest being in it. The content
 * checks need gray-matter and typescript whether or not a test runner is
 * present, so keying on vitest would refuse to link a perfectly usable
 * node_modules and fail those checks with a module-resolution error that looks
 * nothing like the real problem. Vitest is probed separately, where it matters.
 */
/**
 * Every commit this push would ADD to the remote, oldest first.
 *
 * Checking only the tip is not enough, and the reason is the original bug in a
 * different costume: commit A introduces an em dash, commit B repairs it, push
 * the branch, and a tip-only gate reports green while A's bad blob lands on the
 * remote. Measured, not theorised.
 *
 * `--not --remotes` is the lower bound. An earlier draft of this file claimed a
 * brand-new branch has none, because its remote OID on stdin is all zeros. That
 * was wrong: --remotes bounds against every remote-tracking ref regardless of
 * what stdin says, and on a never-pushed branch it returns exactly the new
 * commits.
 *
 * Returns [tip] when the range is empty (a re-push of something already on the
 * remote still deserves one check) or when it is implausibly long, since a
 * stale remote-tracking ref would otherwise re-verify half the history.
 */
function commitsToVerify(tip, cwd) {
  const r = capture("git", ["rev-list", "--reverse", tip, "--not", "--remotes"], { cwd });
  if (!succeeded(r)) return [tip];
  const commits = r.stdout.split("\n").filter(Boolean);
  if (commits.length === 0) return [tip];
  if (commits.length > MAX_RANGE) {
    console.log(
      `  ${commits.length} new commits exceeds the ${MAX_RANGE}-commit range cap; verifying the tip only.`,
    );
    return [tip];
  }
  return commits;
}

function locateNodeModules(cwd) {
  for (const base of [INSTALLED_ROOT, cwd]) {
    const dir = path.join(base, "node_modules");
    if (fs.existsSync(dir)) return dir;
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

  // Symlinks that point outside the extraction root would let a commit redirect
  // the checks at content it does not actually contain. Both guards above are
  // blind to it: git ls-tree counts a symlink blob as one entry, so the count
  // still balances, and existsSync FOLLOWS the link, so a required path can be
  // satisfied by a directory somewhere else on the machine. Verified: committing
  // content/articles as a symlink kept the count at 419 = 419 and passed the
  // floor check, leaving the audit reading a directory that no clone would have.
  const escaping = escapingSymlinks(tree);
  if (escaping.length > 0) {
    blocked([
      `${sha} contains symlinks pointing outside the tree: ${escaping.join(", ")}`,
      "The checks would read content this commit does not contain, so a clone",
      "would not have what was verified. Refusing rather than reporting green.",
    ]);
    return null;
  }

  // lstat, not existsSync: existsSync follows symlinks, which is exactly the
  // hole above. A required directory has to BE a directory in the pushed tree.
  const missing = [];
  const notReal = [];
  for (const rel of REQUIRED_PATHS) {
    const full = path.join(tree, rel);
    let stat;
    try {
      stat = fs.lstatSync(full);
    } catch {
      missing.push(rel);
      continue;
    }
    if (stat.isSymbolicLink()) notReal.push(rel);
  }
  if (missing.length > 0 || notReal.length > 0) {
    blocked([
      `${sha} does not contain everything the checks need.`,
      ...(missing.length > 0 ? [`Missing: ${missing.join(", ")}`] : []),
      ...(notReal.length > 0 ? [`Present but a symlink, not real content: ${notReal.join(", ")}`] : []),
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

/** Run the four checks inside an extracted tree. Returns true when all pass. */
function runChecks(tree, cwd, runTests) {
  const env = { ...process.env };

  // node_modules must be in place BEFORE any check, not just before vitest.
  //
  // Every checker now resolves its paths from its own location rather than from
  // CWD (aeo-audit.mjs REPO_ROOT at :41, verify-dates.mjs at :88,
  // build-brand-map.mjs at :56), which is precisely why the EXTRACTED copies are
  // the ones invoked: their roots then point at the extracted tree. But two of
  // them also import npm packages (gray-matter, typescript), and Node resolves a
  // bare specifier upward from the SCRIPT's directory, so an extracted copy with
  // no node_modules beside it dies with ERR_MODULE_NOT_FOUND before it audits
  // anything. Linking only before the test suites left the content checks broken
  // on every push; caught when main gained those imports in PR #23 (40f4087).
  const nodeModules = locateNodeModules(cwd);
  const link = path.join(tree, "node_modules");
  if (nodeModules !== null && !fs.existsSync(link)) fs.symlinkSync(nodeModules, link, "dir");

  // 1. Content audit.
  const audit = stream("node", [path.join(tree, "scripts", "aeo-audit.mjs")], { cwd: tree, env });
  if (!succeeded(audit)) {
    return blocked([
      `content audit failed for the pushed tree (${describeFailure(audit)}). Common causes:`,
      "em dashes (CONTENT-STANDARDS section 11): remove them, or mark a",
      "  genuinely-functional one with the token: emdash-allow",
      "a metaTitle / article frontmatter title that hard-codes the brand",
      "  (the title template already appends it): remove the brand suffix",
      ...(nodeModules === null ? ["dependencies are not installed: run npm install"] : []),
      "",
      "Note these are read from the COMMIT, not your working tree. Fixing the",
      "file without committing the fix will not clear this.",
    ]);
  }

  // 2. Article frontmatter dates. Runs the checker against the pushed corpus,
  //    which is the only thing that proves the ARTICLES are clean; the unit
  //    suites only prove the CHECKER works, against temp fixtures.
  const dates = stream("node", [path.join(tree, "scripts", "verify-dates.mjs")], { cwd: tree, env });
  if (!succeeded(dates)) {
    return blocked([
      `an article frontmatter date is missing, unquoted, or not a real day (${describeFailure(dates)}).`,
      'Quote it:  date: "2026-02-28"   (single quotes are fine too)',
      "Re-check:  npm run verify-dates",
    ]);
  }

  // 2b. Structured data, including FAQ schema-vs-visible parity. Same reasoning
  //     as the dates check above: this runs against the pushed corpus, which is
  //     the only thing that proves the PAGES are clean, while the unit suite
  //     only proves the checker works against fixtures.
  //
  //     It is here rather than in the hook's degraded path because that path is
  //     a fallback, not the gate. On 2026-08-04 /investment shipped four FAQPage
  //     Q&As that rendered nowhere, and nothing automatic would have caught it:
  //     verify-schema existed but ran only under `npm test`.
  //
  //     SKIP_SCHEMA_CHECK follows the SKIP_UNIT_TESTS precedent. The FAQ half is
  //     a hand-rolled lexer over TypeScript, documented as approximate, and
  //     CLAUDE.md bans --no-verify, so without a named valve one false positive
  //     would block every push with no way through.
  if (env.SKIP_SCHEMA_CHECK !== "1") {
    const schema = stream("node", [path.join(tree, "scripts", "verify-schema.mjs")], { cwd: tree, env });
    if (!succeeded(schema)) {
      return blocked([
        `the structured-data check failed for the pushed tree (${describeFailure(schema)}). Common causes:`,
        "FAQPage schema whose questions are not rendered on the page: feed the",
        "  schema and the visible FAQ from ONE named array, and map that array in JSX",
        "a non-www waypointfranchise.com URL in a page/schema file",
        "Re-check:  npm run verify-schema",
        "Genuinely need to skip?  SKIP_SCHEMA_CHECK=1 git push",
      ]);
    }
  }

  // 3. Brand-identity map drift. The extracted copy must be the one invoked, or
  //    it would compare the INSTALLED repo's map and silently validate the wrong
  //    tree. Its registry source is an absolute homedir()/BIP_REGISTRY_PATH path
  //    to a sibling repo, correctly unaffected by any of this.
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

  // 4. Fast unit suites. Vitest writes one results.json into the shared cache
  //    linked above (a rerun-ordering hint, not correctness state, regenerated
  //    when malformed); nothing else in the real repo is touched.
  if (!runTests || env.SKIP_UNIT_TESTS === "1") return true;

  const vitestBin = nodeModules === null ? null : path.join(nodeModules, ".bin", "vitest");
  if (vitestBin === null || !fs.existsSync(vitestBin)) {
    // Preserves the long-standing behaviour for a fresh clone, but says plainly
    // that verification was incomplete. A quiet "NOTE" next to an exit 0 reads
    // like a clean run, which is the whole failure mode this file exists to end.
    console.log("");
    console.log("NOT VERIFIED: vitest is not installed, so the unit suites did not run.");
    console.log("  This push was allowed without them. Run 'npm install' to enable them.");
    return true;
  }

  const tests = stream(vitestBin, ["run", "--project", "unit", "--project", "auth"], {
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

function verifyOne(sha, cwd, runTests) {
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
    return runChecks(tree, cwd, runTests);
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
    const commits = commitsToVerify(sha, cwd);
    if (commits.length > 1) {
      console.log(`\n[${sha.slice(0, 12)}] ${commits.length} new commits; content checked on each.`);
    }
    // Content is judged per commit, because a violation in an intermediate
    // commit still lands on the remote. The test suites describe the code's
    // behaviour and are run once, on the tip, which is the state that ships.
    for (const commit of commits) {
      const isTip = commit === commits[commits.length - 1];
      console.log(`\n[${commit.slice(0, 12)}]${isTip ? "" : " (intermediate)"}`);
      if (!verifyOne(commit, cwd, isTip)) process.exit(1);
    }
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
