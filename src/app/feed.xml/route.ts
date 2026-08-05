import { NextResponse } from "next/server";
import { getAllArticles } from "../../lib/articles";
import { articleDateObject } from "../../lib/articleDate";

export async function GET() {
  const articles = getAllArticles();
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://waypointfranchise.com";
  
  const rssItems = articles
    .map((article) => {
      const url = `${siteUrl}/resources/${article.slug}`;
      // RFC 822 date, or the element is omitted. "Invalid Date" in a <pubDate>
      // is a parse error for readers, which can invalidate the whole feed
      // rather than just the one item.
      const published = articleDateObject(article.date);
      
      return `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${url}</link>
      <guid>${url}</guid>
${published ? `      <pubDate>${published.toUTCString()}</pubDate>\n` : ""}      <description><![CDATA[${article.excerpt}]]></description>
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
