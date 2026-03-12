import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/privacy", "/terms"],
      },
    ],
    sitemap: "https://waypointfranchise.com/sitemap.xml",
  };
}
