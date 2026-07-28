/**
 * Commit a match-run import inside one transaction.
 *
 * Re-derives everything from the uploaded bytes rather than trusting anything the preview returned:
 * a preview result travels through the client, so treating it as authoritative would let a caller
 * commit something other than what was shown.
 *
 * `actor` is the authenticated session email. Per CONTRACT §2 that records "the advisor initiated
 * this", not "the advisor verified the data". Safety here is structural, not human review.
 */
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { parseImportRequest } from "@/lib/match-workspace/import-request";
import { commitImport, ImportRefused } from "@/lib/match-workspace/import";
import { LineageError } from "@/lib/match-workspace/append";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAdmin(async (req, session) => {
  const parsed = await parseImportRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: [{ code: "BAD_REQUEST", message: parsed.error }] }, { status: 400 });
  }

  try {
    const result = await commitImport(prisma, parsed.rawJson, parsed.files, session.user.email, parsed.bindings);
    // 200 on a replay, 201 on a genuinely new run, so a caller can tell them apart without
    // re-reading. Both are successes: re-importing the same package is defined as a no-op. [C-11]
    return NextResponse.json({ ok: true, ...result }, { status: result.alreadyImported ? 200 : 201 });
  } catch (err) {
    if (err instanceof ImportRefused) {
      return NextResponse.json({ ok: false, errors: err.errors }, { status: 422 });
    }
    if (err instanceof LineageError) {
      // An append-only invariant would have been broken. A conflict, not a server fault.
      return NextResponse.json(
        { ok: false, errors: [{ code: err.code, message: err.message }] },
        { status: 409 },
      );
    }
    console.error("match-workspace import commit failed", err);
    return NextResponse.json(
      { ok: false, errors: [{ code: "COMMIT_FAILED", message: "The import could not be committed." }] },
      { status: 500 },
    );
  }
});
