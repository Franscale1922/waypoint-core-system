import { NextResponse } from "next/server";
import { getAllArticles } from "../../lib/articles";

export async function GET() {
  const articles = getAllArticles();
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waypointfranchise.com";
  
  const rssItems = articles
    .map((article) => {
      const url = `${siteUrl}/resources/${article.slug}`;
      const pubDate = new Date(article.date + "T12:00:00").toUTCString();
      
      return `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${article.excerpt}]]></description>
      <category>${article.category}</category>
    </item>`;
    })
    .join("");

  const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Waypoint Franchise Advisors</title>
    <link>${siteUrl}</link>
    <description>Honest franchise analysis, economics, and readiness guides from Kelsey Stuart.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

  return new NextResponse(rssFeed, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
