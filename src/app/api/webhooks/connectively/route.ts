import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";

// This webhook is designed to receive forwarded emails from Connectively/HARO.
// You will need to set up a rule in Gmail: "If from: Connectively, Forward to: https://waypointfranchise.com/api/webhooks/connectively"
// Services like Postmark, SendGrid, or Zapier can parse the inbound email and hit this webhook.

export async function POST(req: Request) {
  try {
    // 1. Verify a secret token to prevent abuse
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.INBOUND_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse the inbound parsed email body (assuming JSON payload from Zapier or Mail parser)
    const { subject, body_text } = await req.json();

    if (!body_text) {
      return NextResponse.json({ error: "No text found" }, { status: 400 });
    }

    // 3. Initialize Claude to filter and draft responses
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY, // You will need to add this to Vercel
    });

    const prompt = `
You are an expert PR assistant for Kelsey Stuart, a Franchise Advisor. 
Here is a digest of media queries from Connectively/HARO:

<queries>
${body_text}
</queries>

Task 1: Filter the queries. Only select queries that are highly relevant to:
- Franchising (buying, selling, starting)
- Career transition (corporate to business owner)
- Small business funding (ROBS, SBA)
- Entrepreneurship challenges

Task 2: If you find a relevant query, generate a JSON response. If none are found, return { "matches": [] }.
Format the JSON exactly like this:
{
  "matches": [
    {
      "query_title": "The title of the query",
      "reporter": "The reporter's name or outlet",
      "deadline": "The deadline",
      "draft_pitch": "Write a 3-4 sentence pitch from Kelsey. Use a direct, honest, 'no pitch, no pressure' tone. Short sentences. High expertise."
    }
  ]
}
Return ONLY valid JSON.
`;

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Fast and cheap for filtering
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const rawResponse = "text" in message.content[0] ? message.content[0].text : "";
    
    // Attempt to parse JSON response safely
    let parsedMatch;
    try {
      parsedMatch = JSON.parse(rawResponse);
    } catch (e) {
      console.error("Claude returned non-JSON:", rawResponse);
      return NextResponse.json({ error: "LLM parse failure" }, { status: 500 });
    }

    const matches = parsedMatch.matches || [];

    // 4. If nothing relevant, exit quietly
    if (matches.length === 0) {
      return NextResponse.json({ success: true, message: "No relevant PR queries found." });
    }

    // 5. Send Slack alert with the drafted pitches
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      for (const match of matches) {
        await fetch(slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: "🚨 New PR Opportunity (Connectively)" },
              },
              {
                type: "section",
                fields: [
                  { type: "mrkdwn", text: `*Query:*\n${match.query_title}` },
                  { type: "mrkdwn", text: `*Reporter/Outlet:*\n${match.reporter}` },
                  { type: "mrkdwn", text: `*Deadline:*\n${match.deadline}` }
                ]
              },
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Claude's Draft Pitch:*\n> ${match.draft_pitch}`
                }
              }
            ]
          }),
        });
      }
    }

    return NextResponse.json({ success: true, matchCount: matches.length });

  } catch (err: any) {
    console.error("[pr-webhook]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
