/**
 * gitBlobSha.ts
 *
 * Git's object ID for a file's contents, computed locally.
 *
 * WHY THIS IS ITS OWN MODULE
 * --------------------------
 * The two places that need it sit on opposite sides of an existing import: the content refresh
 * hashes a file when it READS it (src/lib/contentRefresh.ts), and the commit path compares that
 * hash against what GitHub currently holds (src/lib/githubArticleCommit.ts, which already imports
 * ArticleFrontmatter from contentRefresh.ts). Putting the function in either one makes the pair
 * circular. Same reason src/lib/frontmatterDates.mjs and src/lib/frontmatterFields.mjs are
 * separate from the module that calls them.
 *
 * WHY IT IS REIMPLEMENTED RATHER THAN ASKED OF GITHUB
 * --------------------------------------------------
 * The whole point is to hash bytes only this process has: the article file as it was when the
 * refresh read it, minutes and one model call ago. Asking GitHub for that SHA would be asking
 * about the file as it is NOW, which is precisely the value being compared against, and the
 * comparison would agree with itself every time.
 *
 * NO EM DASHES IN THIS FILE. It lives under src/, which scripts/aeo-audit.mjs scans, and one here
 * would fail the very push that adds it (CONTENT-STANDARDS Section 11).
 */

import { createHash } from "crypto";

/**
 * The git blob object ID for `content`: `sha1("blob " + byteLength + "\0" + bytes)`.
 *
 * THE HEADER IS NOT DECORATION. It is what makes this a git object ID rather than a content hash.
 * Without it the value is a perfectly good digest of the same bytes that matches nothing git has
 * ever stored, and every comparison against a real tree entry fails.
 *
 * `byteLength`, NOT `.length`. The header carries the length in BYTES. A string's `.length` counts
 * UTF-16 code units, and the two differ for any non-ASCII character: 37 of the 45 articles in
 * content/articles/ contain at least one (em dashes in prose, curly quotes, accented names). Using
 * the character count would produce a wrong object ID for every one of them, and the caller would
 * read that as "this file changed underneath me" for files nobody had touched. Hashing the Buffer
 * rather than the string is the same guard from the other side.
 *
 * SHA-1 IS NOT A SECURITY CHOICE and its collision weakness does not apply here. This value is
 * compared against git's own object ID for the same content, so it has to be exactly the algorithm
 * git uses; substituting SHA-256 would not harden anything, it would break every comparison.
 * Anyone able to author colliding article bodies already has commit access to the repository.
 *
 * The caller must pass the bytes as they were READ, never a re-serialization of parsed frontmatter
 * plus body: gray-matter normalises key order, quoting and whitespace on the way out, so
 * re-serialized bytes are equivalent to the file without being identical to it.
 */
export function gitBlobSha(content: string): string {
  const bytes = Buffer.from(content, "utf-8");
  return createHash("sha1")
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest("hex");
}
