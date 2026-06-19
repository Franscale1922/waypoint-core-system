import { NextResponse } from "next/server";

// /robots.txt: hand-rendered so we can declare AIPREF Content Signals.
//
// Next's metadata `robots.ts` convention only emits the standard directives
// (Allow / Disallow / Sitemap) and has no field for `Content-Signal`, so this
// route owns the file instead. The crawl rules below are the same ones that
// used to live in robots.ts; the Content-Signal line is the only addition.
//
// Content Signals state how automated clients may USE content they retrieve.
// They are a statement of preference, not an access-control mechanism. Signal
// definitions and the published policy comment below track the IETF draft
// "Vocabulary For Expressing Content Signals" (draft-romm-aipref-contentsignals).
//
// Waypoint's stance: discoverable, but not training fodder:
//   search=yes    surface us in search results that link back here
//   ai-input=yes  let AI assistants ground answers in our content (and cite us)
//   ai-train=no   do not train or fine-tune models on our content
// This mirrors the agent-facing investment elsewhere on the site (/llms.txt,
// /llms-full.txt, and the Accept: text/markdown content negotiation).
//
// Spec: https://datatracker.ietf.org/doc/draft-romm-aipref-contentsignals/
// Docs: https://contentsignals.org/

export const dynamic = "force-static";
export const revalidate = 86400;

const SITE = "https://www.waypointfranchise.com";

// Published policy block. A "yes" permits the corresponding use of content from
// URLs this file allows; a "no" forbids it absent separately granted permission.
// Definitions are quoted from the AIPREF Content Signals draft.
const POLICY = `# Content Signals Policy
#
# By setting the content signal below, this site expresses preferences about how
# its content may be used by automated systems once retrieved. "yes" permits the
# corresponding use of content from URLs this file allows; "no" forbids that use
# unless the operator has separately granted permission. This is a statement of
# preference, not an access-control mechanism.
#
#   search   = using content in a search application that directs users to the
#              location from which the content was retrieved.
#   ai-input = inputting content into AI models for retrieval-augmented
#              generation, grounding, or other real-time taking of content.
#   ai-train = training or fine-tuning AI models.
#
# Spec: https://datatracker.ietf.org/doc/draft-romm-aipref-contentsignals/`;

export function GET() {
  const body = `${POLICY}

User-Agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /inngest
Disallow: /emails

Sitemap: ${SITE}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
