import { NextResponse } from "next/server";
import { fullSiteMarkdown, estimateTokens } from "@/lib/markdown-views";

// /llms-full.txt: the companion to /llms.txt. Where llms.txt is the index,
// this is the entire public corpus (all articles + glossary + FAQ) as one
// markdown document, so an agent can ingest the whole knowledge base in a
// single fetch. Served as text/plain (the llms.txt convention) so it renders
// inline rather than downloading.

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const body = fullSiteMarkdown();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-markdown-tokens": String(estimateTokens(body)),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
