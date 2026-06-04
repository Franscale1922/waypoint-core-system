import { NextResponse } from "next/server";
import {
  articleMarkdown,
  resourcesIndexMarkdown,
  glossaryMarkdown,
  faqMarkdown,
  estimateTokens,
  categoryNameFromSlug,
} from "@/lib/markdown-views";

// Markdown representations of the site's content-rich pages.
//
// middleware.ts rewrites a page request here when an agent (a) sends
// `Accept: text/markdown` or (b) appends `.md` to the URL. The URL the agent
// typed never changes for the Accept path — this is content negotiation, not a
// separate page. Browsers (Accept: text/html) are never rewritten.

function render(path: string[]): string | null {
  if (path.length === 1) {
    if (path[0] === "resources") return resourcesIndexMarkdown();
    if (path[0] === "glossary") return glossaryMarkdown();
    if (path[0] === "faq") return faqMarkdown();
    return null;
  }
  if (path.length === 2 && path[0] === "resources") {
    const seg = path[1];
    // Category index pages vs. individual articles share the /resources/* space.
    const categoryName = categoryNameFromSlug(seg);
    if (categoryName) return resourcesIndexMarkdown(categoryName);
    return articleMarkdown(seg);
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const body = render(path ?? []);

  if (body == null) {
    // Mirror the HTML notFound() so agents and browsers see the same 404.
    return new NextResponse(
      "# Not Found\n\nNo markdown document exists at this URL.\n",
      {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
          "X-Robots-Tag": "noindex",
        },
      }
    );
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The same URL serves HTML or markdown — caches must key on Accept.
      Vary: "Accept",
      // HTML is the canonical, indexable representation; keep the markdown
      // variant (and its direct .md URL) out of the search index.
      "X-Robots-Tag": "noindex",
      "x-markdown-tokens": String(estimateTokens(body)),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
