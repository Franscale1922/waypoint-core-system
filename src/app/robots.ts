import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Block private/internal routes — no SEO value and some contain sensitive UI
        disallow: ["/admin", "/api/", "/inngest", "/emails"],
      },
    ],
    sitemap: "https://www.waypointfranchise.com/sitemap.xml",
  };
}
