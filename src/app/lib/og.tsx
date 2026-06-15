// Shared layout for dynamically generated Open Graph / social cards (next/og
// ImageResponse). Used by the route-colocated opengraph-image.tsx files so each
// pillar/category page gets a distinct, on-brand card instead of the generic
// default. JSX here is rendered by Satori (ImageResponse) — only inline styles,
// every multi-child element must set display:flex.

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_ALT = "Waypoint Franchise Advisors";
export const OG_CONTENT_TYPE = "image/png";

export function OgCard({
  eyebrow,
  title,
  tagline,
}: {
  eyebrow: string;
  title: string;
  tagline?: string;
}) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0c1929",
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: "#FAF8F4", letterSpacing: -0.5 }}>
          Waypoint
        </span>
        <span style={{ fontSize: 18, fontWeight: 600, color: "#CC6535", textTransform: "uppercase", letterSpacing: 3 }}>
          Franchise Advisors
        </span>
      </div>

      {/* Title block */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: "#CC6535", textTransform: "uppercase", letterSpacing: 4, marginBottom: 20 }}>
          {eyebrow}
        </span>
        <span style={{ fontSize: 64, fontWeight: 700, color: "#FAF8F4", lineHeight: 1.1, maxWidth: 1000 }}>
          {title}
        </span>
        {tagline ? (
          <span style={{ fontSize: 27, color: "rgba(255,255,255,0.72)", marginTop: 26, maxWidth: 1000, lineHeight: 1.35 }}>
            {tagline}
          </span>
        ) : null}
      </div>

      {/* Accent bar */}
      <div style={{ display: "flex", width: 120, height: 6, background: "#CC6535" }} />
    </div>
  );
}
