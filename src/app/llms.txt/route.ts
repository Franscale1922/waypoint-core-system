import { NextResponse } from "next/server";
import { llmsIndexText } from "@/lib/llms-index";
import { estimateTokens } from "@/lib/markdown-views";

// /llms.txt: the machine-readable site index for LLMs/agents.
//
// The whole document is generated in src/lib/llms-index.ts, so links and counts
// derive from the same content modules the pages render from. Nothing is
// hardcoded here, including the origin: a literal URL in this file is what put a
// non-www /book link (and a 301 hop) in front of every agent that read it.
//
// The companion /llms-full.txt carries the entire corpus; this is the index.

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const body = llmsIndexText();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(body)),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
