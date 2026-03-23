import crypto from "crypto";

// ── Unsubscribe token helpers ──────────────────────────────────────────────────
// HMAC-based 1-click unsubscribe. Secret set in UNSUBSCRIBE_SECRET env var.
// Every nurture email footer contains a unique signed URL for this download record.

export function buildUnsubscribeUrl(downloadId: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET env var is not set");
  const token = crypto
    .createHmac("sha256", secret)
    .update(downloadId)
    .digest("hex");
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com";
  return `${base}/api/unsubscribe?id=${downloadId}&token=${token}`;
}

export function verifyUnsubscribeToken(downloadId: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(downloadId)
    .digest("hex");
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// ── Compliance footer ──────────────────────────────────────────────────────────
// Appended to every nurture email. Keeps CAN-SPAM compliant.
export function buildNurtureFooter(unsubscribeUrl: string): string {
  return [
    "",
    "---",
    "Waypoint Franchise Advisors",
    "P.O. Box 3421, Whitefish, MT 59937",
    `To stop receiving these notes: ${unsubscribeUrl}`,
  ].join("\n");
}

// ── Email 2 — "One thing worth checking" ──────────────────────────────────────
// Sent Day 3. Category-specific insight, no ask.
export const NURTURE_EMAIL_2: Record<string, { subject: string; body: string }> = {
  universal: {
    subject: "one thing worth checking",
    body: `Most people who download a readiness checklist are asking the same underlying question: do I have what this actually takes, or am I just curious?

Those are two different conversations, and they lead to very different places.

The one thing I'd make sure you have a clear answer to before anything else: what would you need to replace, income-wise, and over what timeline. Not a guess. An actual number.

That question shapes everything else about how you'd evaluate options.`,
  },
  "food-and-beverage": {
    subject: "one thing worth checking",
    body: `One thing that surprises most people looking at food and restaurant franchises: the checklist is almost never about passion for the industry.

The operators who do well usually had no background in food. They came from operations, finance, or sales. What they had was process discipline and the ability to manage people they didn't hire.

If that sounds more like you than someone who loves to cook, that's worth knowing going in.`,
  },
  "home-services": {
    subject: "one thing worth checking",
    body: `The thing people underestimate about home services franchises: the work itself is B2B, not B2C.

You're building relationships with property managers, insurance adjusters, and realtors. The homeowner hires you once. The referral source hires you a hundred times.

If you have a background in sales relationships, account management, or any kind of territory work, you're more prepared for this category than most people realize.`,
  },
  "fitness-wellness": {
    subject: "one thing worth checking",
    body: `Fitness and wellness franchises look like a passion play from the outside. From the inside, they're a real estate and staffing business.

The location decision is the most consequential thing you'll do. Membership retention is driven almost entirely by instructor quality and class consistency. Both of those are management problems, not fitness problems.

Worth thinking about whether your background is in the operational side of things or the enthusiasm side. They require different skills.`,
  },
  "senior-care": {
    subject: "one thing worth checking",
    body: `Senior care franchises are one of the few categories where demand is structurally guaranteed for the next 30 years. That's the obvious part.

The less obvious part: this business runs on caregiver recruitment and retention more than almost anything else. Labor is the constraint, not client demand. The operators who succeed treat HR as a core competency, not an afterthought.

If that's a strength you're bringing in, it changes the math considerably.`,
  },
  b2b: {
    subject: "one thing worth checking",
    body: `B2B franchise categories get less attention than consumer brands, but they tend to have more defensible economics.

Contracts are longer. Clients are stickier. Revenue is more predictable. And the sales cycle maps well to how most corporate professionals already know how to work.

The question I'd ask: do you have existing relationships in a specific vertical that could become your first clients? That's often the difference between a slow first year and a fast one.`,
  },
};

// ── Email 3 — "One question" ───────────────────────────────────────────────────
// Sent Day 7. Single diagnostic question. CTA: reply with the answer.
export const NURTURE_EMAIL_3: Record<string, { subject: string; body: string }> = {
  universal: {
    subject: "one question",
    body: `If you replied to the last note, I probably already know the answer to this. If you didn't, here's the one question I'd ask you if we were talking:

What is driving the interest right now? Not the long-term interest in ownership. I mean what is happening in your life today that made you look this up.

You don't have to answer it here. But it's worth sitting with. The answer usually tells you more about your timeline than any checklist does.`,
  },
  "food-and-beverage": {
    subject: "one question",
    body: `One question for you, and you can reply directly with the answer if you want:

Are you drawn to food and restaurant franchises because of the industry, or because the unit economics looked interesting when you looked into it?

Both are valid starting points. But they lead to different conversations. The first usually opens up to a broader search. The second usually narrows pretty quickly to a specific model.`,
  },
  "home-services": {
    subject: "one question",
    body: `One thing worth knowing before we'd ever talk: are you looking at a single territory or do you have regional or multi-unit expansion in mind?

Home services franchises scale well, but the first territory requires hands-on time that most people underestimate. The model changes significantly once you've hired your first territory manager.

No wrong answer. It just shapes what questions are worth asking first.`,
  },
  "fitness-wellness": {
    subject: "one question",
    body: `One question worth thinking about before any serious conversation in this category:

Do you have a sense of the market you'd be operating in? Boutique fitness is extremely location-sensitive. The same brand performs very differently in a suburban strip center vs. a dense walkable neighborhood.

If you've already scoped a market or a few potential sites, that changes what we'd look at. If not, that's where most serious conversations start.`,
  },
  "senior-care": {
    subject: "one question",
    body: `One question for you, and it's one I ask everyone looking at senior care:

Do you have a personal connection to the industry? A parent, a relative, a situation you watched someone navigate? Or is this primarily a business decision based on the demographics?

I ask because people who enter this category with a personal connection tend to sustain the motivation through the harder operational periods. Those who enter purely on the numbers sometimes don't.

Both paths work. It's useful to know which one you're on.`,
  },
  b2b: {
    subject: "one question",
    body: `One question I'd ask if we were talking: what's your target annual revenue in year three?

I ask because B2B franchise categories have a reasonably wide range of ceiling potential depending on the model, the territory, and how aggressively you build a sales team vs. staying owner-operated.

If you have a number in mind, it narrows the field considerably. If you don't yet, that's a good place to start.`,
  },
};

// ── Email 4 — "What the process looks like" (universal) ───────────────────────
// Sent Day 14. Sets expectations, soft CTA for a call.
export const NURTURE_EMAIL_4 = {
  subject: "what the process looks like",
  body: `If you've been thinking about any of what I sent, here's what the process actually looks like if you decided to explore further.

We'd start with a call. 30 to 45 minutes. No pitch. I ask questions, you ask questions, and at the end we both have a better sense of whether the fit is there to keep going.

If it makes sense to continue, I'd put together a short list of franchise categories that match your background, capital range, and lifestyle priorities. You'd review them, and we'd narrow from there.

The whole process takes eight to twelve weeks for most people. Nobody buys anything on a first call.

If any of this sounds worth exploring, reply and let me know. We can find a time.`,
};

// ── Email 5 — "Last note" (universal) ─────────────────────────────────────────
// Sent Day 21. Low-pressure close. Explicitly unsubscribe-friendly.
export const NURTURE_EMAIL_5 = {
  subject: "last note",
  body: `This is the last note I'll send.

If the timing isn't right, that's completely fine. Most people who end up working with me weren't ready the first time they looked into this. Life moves, priorities shift, and sometimes a year or two makes all the difference.

If things change and you want to have a conversation at some point, you can always reach me at kelsey@waypointfranchise.com. The call is free and there's no obligation on either end.

Take care,
Kelsey`,
};
