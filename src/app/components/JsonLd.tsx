/**
 * Renders a JSON-LD <script> with the one risky API (dangerouslySetInnerHTML)
 * centralized in a single place.
 *
 * SECURITY: JSON.stringify does NOT escape "<", so a schema string containing the
 * literal "</script>" (or "<!--") would terminate the inline <script> early and
 * inject raw markup. We escape "<" → "<", which is semantically identical to
 * JSON-LD parsers but cannot break out of the script element. This matters for
 * content-derived values (article titles/excerpts, FAQ answers, glossary terms).
 *
 * Use this instead of hand-writing <script type="application/ld+json"> everywhere.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
