/**
 * Preview a match-run import. Validates, resolves and reports. Writes NOTHING.
 *
 * Gated by `withAdmin`, which is the primary auth control in this app (middleware is defense in
 * depth only). The session email is not recorded here because nothing is recorded here.
 */
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/with-admin";
import prisma from "@/lib/prisma";
import { parseImportRequest } from "@/lib/match-workspace/import-request";
import { previewImport } from "@/lib/match-workspace/import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAdmin(async (req) => {
  const parsed = await parseImportRequest(req);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: [{ code: "BAD_REQUEST", message: parsed.error }] }, { status: 400 });
  }

  const report = await previewImport(prisma, parsed.rawJson, parsed.files, parsed.bindings);
  // 200 either way: a refused package is a successful preview of a refusal, and the caller reads
  // `ok`. The uploaded bytes are never echoed back, only their digests.
  return NextResponse.json(report, { status: 200 });
});
