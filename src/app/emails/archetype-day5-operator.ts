/**
 * Archetype Email 3 (Day 5): Strength + trap insight for The Operator
 * Sent ~5 days after archetype quiz completion
 * Tag: archetype-email-3
 */

export function archetypeDay5OperatorHtml(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Operator's trap when buying a franchise</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F4;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="margin-bottom:32px;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8E3012;">
        WAYPOINT FRANCHISE ADVISORS
      </p>
    </div>

    <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.3;">
      ${firstName}, the Operator's trap when evaluating a franchise.
    </h1>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Your strength is that you can look at a process and know whether it is going to scale. You see the inefficiency before anyone in the room has named it. You believe in checklists, dispatch software, and P&L discipline because you have watched them save businesses other people could not. That instinct is exactly what franchising rewards when the model is real.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      The trap is that Operators believe what a brand markets about its operating system. The website talks about proprietary technology. The discovery day shows you a dashboard. The field rep walks you through the playbook binder. All of those signals can be real or they can be a thin layer over very little. Operators are wired to trust the system, and that trust is exactly what a brand with a weak operating spine is trying to borrow from you.
    </p>

    <!-- The framework -->
    <div style="background:#FBFAF6;border:1px solid #e2ddd2;border-radius:12px;padding:24px 28px;margin:32px 0;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;color:#8E3012;letter-spacing:0.1em;text-transform:uppercase;">A FILTER THAT HELPS</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1a1a1a;">Two questions to bring to every operations conversation:</p>
      <p style="margin:0 0 12px;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>1.</strong> &nbsp;Show me a real franchisee's monthly operating report, not the corporate template. What does the actual variance between brand-best and median look like?
      </p>
      <p style="margin:0;font-size:15px;color:#4a4a4a;line-height:1.7;">
        <strong>2.</strong> &nbsp;When a franchisee is missing a labor cost target by six points, what is the franchisor's actual response in the first 30 days? Walk me through what happens.
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      Both questions ask a brand to expose the parts of their operating model that do not make it into marketing decks. A strong brand answers crisply because they have the data. A weak brand gives you a story about culture and partnership. Watch which one you are getting.
    </p>

    <!-- Pull quote -->
    <div style="border-left:3px solid #CC6535;padding-left:20px;margin:28px 0;">
      <p style="margin:0;font-size:17px;color:#1a1a1a;line-height:1.5;font-style:italic;">
        The Operators who land well are not the ones who picked the brand with the longest playbook. They are the ones who learned to ask whether the playbook actually gets used.
      </p>
    </div>

    <p style="margin:28px 0 28px;font-size:16px;color:#4a4a4a;line-height:1.7;">
      If you want a second set of eyes on whether a franchisor's operating model can hold up to what you would actually do with it, that is the kind of conversation I have all day. Free, no pitch.
    </p>

    <a href="https://waypointfranchise.com/book"
       style="display:inline-block;background:#CC6535;color:#0c1929;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:16px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.05em;">
      Book a Free 30-Min Call
    </a>

    <div style="border-top:1px solid #e2ddd2;margin-top:40px;padding-top:24px;">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">— Kelsey Stuart</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#7a7a7a;">Waypoint Franchise Advisors · Whitefish, Montana</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#aaa;">
        You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="${unsubscribeUrl}" style="color:#aaa;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim();
}

export function archetypeDay5OperatorText(name: string, unsubscribeUrl: string): string {
  const firstName = name.split(" ")[0];
  return `
${firstName},

The Operator's trap when evaluating a franchise.

Your strength is that you can look at a process and know whether it is going to scale. You see the inefficiency before anyone in the room has named it. You believe in checklists, dispatch software, and P&L discipline because you have watched them save businesses other people could not. That instinct is exactly what franchising rewards when the model is real.

The trap is that Operators believe what a brand markets about its operating system. The website talks about proprietary technology. The discovery day shows you a dashboard. The field rep walks you through the playbook binder. All of those signals can be real or they can be a thin layer over very little.

A filter that helps. Two questions to bring to every operations conversation:

1. Show me a real franchisee's monthly operating report, not the corporate template. What does the actual variance between brand-best and median look like?

2. When a franchisee is missing a labor cost target by six points, what is the franchisor's actual response in the first 30 days? Walk me through what happens.

A strong brand answers crisply because they have the data. A weak brand gives you a story about culture and partnership. Watch which one you are getting.

The Operators who land well are not the ones who picked the brand with the longest playbook. They are the ones who learned to ask whether the playbook actually gets used.

Book a free call: https://waypointfranchise.com/book

— Kelsey Stuart
Waypoint Franchise Advisors · Whitefish, Montana
`.trim();
}
