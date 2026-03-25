// ─── Escape Kit Email Builder ──────────────────────────────────────────────────
// Renders the Corporate Escape Kit guide as a branded HTML email.
// Design tokens: navy #122640, copper #CC6535, cream #F5F0E8.
// All styles inline — Gmail/Outlook strip external CSS.

// ── HTML escape ────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Section parser ──────────────────────────────────────────────────────────────
// Parses the corporate-escape-kit.md file into sections with heading + paragraphs.
interface EscapeKitSection {
  heading: string;
  paragraphs: string[];
}

function parseEscapeKitMarkdown(markdown: string): EscapeKitSection[] {
  const lines = markdown.split("\n");
  const sections: EscapeKitSection[] = [];
  let current: EscapeKitSection | null = null;
  let buf: string[] = [];

  const flushBuf = () => {
    if (current && buf.length > 0) {
      const text = buf.join(" ").trim();
      if (text) current.paragraphs.push(text);
      buf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Skip top-level title and subtitle
    if (line.startsWith("# ") || line.startsWith("## ") && line.includes("Financial Safety")) continue;
    // Skip horizontal rules
    if (line === "---") { flushBuf(); continue; }
    // Skip footer attribution lines
    if (line.startsWith("*Kelsey Stuart") || line === "") {
      flushBuf();
      continue;
    }

    // Numbered section headings like "## 1. The W2 Safety Net Myth"
    if (line.startsWith("## ")) {
      flushBuf();
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), paragraphs: [] };
      continue;
    }

    // Collect paragraph text — strip leading bold markers for bullet-like lines
    if (current) {
      // Convert "**Label.** Body text." → "Label: Body text." for plain rendering
      const cleaned = line.replace(/\*\*([^*]+)\*\*/g, "$1");
      // Skip pure empty lines already handled above; append non-empty to buf
      if (cleaned) buf.push(cleaned);
    }
  }

  flushBuf();
  if (current) sections.push(current);
  return sections;
}

// ── HTML email builder ─────────────────────────────────────────────────────────
export function buildEscapeKitEmail(params: {
  firstName: string;
  guideMarkdown: string;
  unsubscribeUrl: string;
}): string {
  const { firstName, guideMarkdown, unsubscribeUrl } = params;
  const sections = parseEscapeKitMarkdown(guideMarkdown);

  const preHeader = "Your Corporate Escape Kit is inside. Five sections on the financial realities of franchising vs. W2.";
  const pad = Array(60).fill("\u200C\u00A0").join("");

  const bookUrl = "https://www.waypointfranchise.com/book";

  const sectionsHtml = sections
    .map((sec, i) => {
      const parasHtml = sec.paragraphs
        .map(
          (p) =>
            `<p style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#3a3a3a;line-height:1.75;">${esc(p)}</p>`
        )
        .join("");
      return `
      <tr><td style="padding:${i === 0 ? "28px" : "20px"} 40px 0;">
        <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#8E3012;">${esc(sec.heading)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="height:2px;background-color:#CC6535;border-radius:1px;margin-bottom:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
        <div style="height:12px;"></div>
        ${parasHtml}
      </td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>The Corporate Escape Kit</title>
  <style type="text/css">
    body,table,td,p,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    @media only screen and (max-width:620px){
      .w600{width:100%!important;}
      .mpad{padding-left:20px!important;padding-right:20px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#EDE7DA;">

<!-- pre-header -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preHeader)} ${pad}</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EDE7DA;">
<tr><td align="center" style="padding:24px 12px 40px;">
<table role="presentation" class="w600" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background-color:#122640;padding:28px 40px 24px;border-radius:8px 8px 0 0;">
    <p style="margin:0 0 8px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#CC6535;">WAYPOINT FRANCHISE ADVISORS</p>
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#FAF8F4;line-height:1.3;">The Corporate Escape Kit</p>
    <p style="margin:6px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:rgba(250,248,244,0.6);">Financial Safety Nets of Franchising vs. W2</p>
  </td></tr>

  <!-- GREETING -->
  <tr><td class="mpad" style="background-color:#F5F0E8;padding:28px 40px 0;">
    <p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;color:#1a1a1a;">Hi ${esc(firstName)},</p>
    <p style="margin:0 0 20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#4a4a4a;line-height:1.75;">Here is the Corporate Escape Kit you requested. Five sections on the financial realities most people don't think through clearly before making any decision about ownership.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr><td style="height:1px;background-color:#d99070;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </td></tr>

  <!-- GUIDE SECTIONS -->
  <tr><td style="background-color:#F5F0E8;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${sectionsHtml}
      <tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </td></tr>

  <!-- CTA BAND -->
  <tr><td class="mpad" style="background-color:#122640;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#CC6535;">NEXT STEP</p>
    <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;color:#FAF8F4;line-height:1.4;">Want to work through any of this with someone who does it for a living?</p>
    <a href="${esc(bookUrl)}" style="display:inline-block;background-color:#CC6535;color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:3px;">Book a Call with Kelsey</a>
    <p style="margin:16px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:rgba(250,248,244,0.5);">No cost. No obligation. 30 minutes.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td class="mpad" style="background-color:#0c1929;padding:22px 40px 26px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(250,248,244,0.65);">Kelsey Stuart &mdash; Waypoint Franchise Advisors</p>
    <p style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(250,248,244,0.35);">P.O. Box 3421, Whitefish, MT 59937 &bull; waypointfranchise.com</p>
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(250,248,244,0.3);line-height:1.6;">
      You requested this guide from Waypoint Franchise Advisors.<br>
      <a href="${esc(unsubscribeUrl)}" style="color:rgba(250,248,244,0.35);text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
