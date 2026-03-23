// ─── Checklist Email Builder ───────────────────────────────────────────────────
// Parses checklist markdown into structured data, then renders a full HTML email
// using Waypoint's design tokens (navy #122640, copper #CC6535, cream #F5F0E8).
// All styles are inline — CSS classes are stripped by Gmail / Outlook.

interface ChecklistSection {
  title: string;
  items: string[];
}

interface ScoringTier {
  label: string;       // e.g. "22 to 24: Strong position"
  description: string; // e.g. "You understand the demands..."
}

interface ParsedChecklist {
  title: string;
  introParagraphs: string[];
  sections: ChecklistSection[];
  scoringTiers: ScoringTier[];
  bookCallUrl: string;
}

// ── HTML escape ────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Markdown parser ────────────────────────────────────────────────────────────
// Handles the standard checklist .md structure:
//   # Title
//   **Author line** (skipped)
//   ---
//   Intro paragraph(s)
//   ---
//   ## Section N: Name
//   - [ ] item
//   ---
//   ## Scoring Guide
//   **X to Y: Label.** Description.
//   ---
//   [Book a call...](...url...)

export function parseChecklistMarkdown(markdown: string): ParsedChecklist {
  const lines = markdown.split("\n");

  let title = "";
  let bookCallUrl = "https://www.waypointfranchise.com/book";
  const sections: ChecklistSection[] = [];
  const scoringTiers: ScoringTier[] = [];
  const introParagraphs: string[] = [];

  let currentSection: ChecklistSection | null = null;
  let mode: "pre" | "intro" | "sections" | "scoring" | "done" = "pre";
  let currentIntroBuf: string[] = [];

  const flushIntro = () => {
    const text = currentIntroBuf.join(" ").trim();
    if (text) introParagraphs.push(text);
    currentIntroBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    // Title
    if (line.startsWith("# ") && !title) {
      title = line.slice(2).trim();
      continue;
    }

    // CTA book link
    const ctaMatch = line.match(/\[Book a call[^\]]*\]\(([^)]+)\)/i);
    if (ctaMatch) { bookCallUrl = ctaMatch[1]; continue; }

    // Skip attribution / footer / ready-to-talk lines
    if (
      (line.startsWith("**") && (
        line.includes("Kelsey Stuart") ||
        line.includes("Waypoint Franchise Advisors") ||
        line.includes("Ready to talk")
      )) ||
      (line.startsWith("*") && line.endsWith("*") && line.includes("Waypoint"))
    ) continue;

    // Dividers drive mode transitions
    if (line === "---") {
      if (mode === "pre") { mode = "intro"; }
      else if (mode === "intro") { flushIntro(); mode = "sections"; }
      else if (mode === "sections") {
        if (currentSection) { sections.push(currentSection); currentSection = null; }
      } else if (mode === "scoring") { mode = "done"; }
      continue;
    }

    // Section headers
    if (line.startsWith("## ") && (mode === "sections" || mode === "scoring")) {
      const heading = line.slice(3).trim();
      if (heading.toLowerCase() === "scoring guide") {
        if (currentSection) { sections.push(currentSection); currentSection = null; }
        mode = "scoring";
        continue;
      }
      if (mode === "sections") {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: heading, items: [] };
        continue;
      }
    }

    // Checklist items
    if (line.startsWith("- [ ]") && currentSection) {
      currentSection.items.push(line.slice(5).trim());
      continue;
    }

    // Intro collection (blank line = paragraph break)
    if (mode === "intro") {
      if (!line) { flushIntro(); }
      else { currentIntroBuf.push(line); }
      continue;
    }

    // Scoring tiers: **Label.** Description.
    if (mode === "scoring" && line) {
      const m = line.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
      if (m) {
        const label = m[1].trim().replace(/\.$/, "");
        if (!label.toLowerCase().startsWith("a note")) {
          scoringTiers.push({ label, description: m[2].trim() });
        }
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  return { title, introParagraphs, sections, scoringTiers, bookCallUrl };
}

// ── HTML email builder ─────────────────────────────────────────────────────────
export function buildChecklistEmail(params: {
  firstName: string;
  checklistLabel: string;
  parsed: ParsedChecklist;
  unsubscribeUrl: string;
}): string {
  const { firstName, checklistLabel, parsed, unsubscribeUrl } = params;
  const { title, introParagraphs, sections, scoringTiers, bookCallUrl } = parsed;

  // Pre-header: visible inbox preview text
  const preHeader = `Your ${checklistLabel} checklist is ready. Use it before your next franchise conversation.`;
  // Zero-width non-joiners pad out the preview to prevent inbox showing body text
  const pad = Array(60).fill("\u200C\u00A0").join("");

  // ── Section rows ─────────────────────────────────────────────────────────────
  const sectionsHtml = sections.map((sec, sIdx) => {
    const items = sec.items.map((item, iIdx) => {
      const bg = iIdx % 2 === 0 ? "#FAF8F4" : "#FFFFFF";
      return `
        <tr><td style="padding-top:4px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="background-color:${bg};border:1px solid rgba(26,26,26,0.07);border-radius:4px;padding:11px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
              <td width="26" valign="top" style="padding-right:10px;padding-top:1px;font-family:Arial,sans-serif;font-size:15px;color:#CC6535;line-height:1.6;">&#9744;</td>
              <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.65;">${esc(item)}</td>
            </tr></table>
          </td>
          </tr></table>
        </td></tr>`;
    }).join("");

    return `
      <tr><td style="background-color:#F5F0E8;padding:${sIdx === 0 ? "8" : "24"}px 40px 0;">
        <p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#8E3012;">${esc(sec.title)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${items}
        </table>
      </td></tr>`;
  }).join("");

  // ── Scoring tiers ─────────────────────────────────────────────────────────────
  const tiersHtml = scoringTiers.map((tier, i) => `
    <tr><td style="${i < scoringTiers.length - 1 ? "padding-bottom:14px;" : ""}">
      <p style="margin:0 0 3px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;color:#122640;">${esc(tier.label)}</p>
      <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#4a4a4a;line-height:1.6;">${esc(tier.description)}</p>
    </td></tr>`).join("");

  // ── Intro paragraphs ───────────────────────────────────────────────────────────
  const introHtml = introParagraphs
    .map(p => `<p style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#4a4a4a;font-style:italic;line-height:1.75;">${esc(p)}</p>`)
    .join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>${esc(title)}</title>
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
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;color:#FAF8F4;line-height:1.3;">Your Checklist Is Ready</p>
  </td></tr>

  <!-- GREETING + HAIRLINE -->
  <tr><td class="mpad" style="background-color:#F5F0E8;padding:28px 40px 0;">
    <p style="margin:0 0 20px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;color:#1a1a1a;">Hi ${esc(firstName)},</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr><td style="height:1px;background-color:#d99070;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </td></tr>

  <!-- TITLE + INTRO -->
  <tr><td class="mpad" style="background-color:#F5F0E8;padding:22px 40px 12px;">
    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#122640;line-height:1.3;">${esc(title)}</h1>
    ${introHtml}
  </td></tr>

  <!-- CHECKLIST SECTIONS -->
  ${sectionsHtml}

  <!-- SPACER -->
  <tr><td style="background-color:#F5F0E8;height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- SCORING GUIDE -->
  <tr><td class="mpad" style="background-color:#F5F0E8;padding:0 40px 28px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td style="border-left:3px solid #CC6535;background-color:#FAF8F4;padding:20px 24px;border-radius:0 4px 4px 0;">
      <p style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#8E3012;">SCORING GUIDE</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${tiersHtml}
      </table>
    </td></tr>
    </table>
  </td></tr>

  <!-- CTA BAND -->
  <tr><td class="mpad" style="background-color:#122640;padding:32px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#CC6535;">NEXT STEP</p>
    <p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:normal;color:#FAF8F4;line-height:1.4;">Ready to talk through where you landed?</p>
    <a href="${esc(bookCallUrl)}" style="display:inline-block;background-color:#CC6535;color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:3px;mso-padding-alt:14px 32px;">Book a Call with Kelsey</a>
    <p style="margin:16px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:rgba(250,248,244,0.5);">No cost. No obligation. 30 minutes.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td class="mpad" style="background-color:#0c1929;padding:22px 40px 26px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(250,248,244,0.65);">Kelsey Stuart &mdash; Waypoint Franchise Advisors</p>
    <p style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(250,248,244,0.35);">P.O. Box 3421, Whitefish, MT 59937 &bull; waypointfranchise.com</p>
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(250,248,244,0.3);line-height:1.6;">
      You received this because you requested a franchise readiness checklist.<br>
      <a href="${esc(unsubscribeUrl)}" style="color:rgba(250,248,244,0.35);text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
