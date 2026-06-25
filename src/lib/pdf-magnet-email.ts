// ─── PDF Lead-Magnet Email Builder ─────────────────────────────────────────────
// Renders a branded HTML delivery email with a prominent download button for a
// PDF lead magnet (Pitch Decoder, AI Paperwork Reader). Mirrors the visual system
// of escape-kit-email.ts but delivers a downloadable file instead of inline markdown.
// Design tokens: navy #122640, copper #CC6535, cream #F5F0E8. All styles inline.

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPdfMagnetEmail(params: {
  firstName: string;
  kicker: string;          // small uppercase label above the title
  title: string;           // serif headline in the header band
  subtitle: string;        // light line under the title
  intro: string[];         // 2-3 short intro sentences (each its own <p>)
  downloadUrl: string;     // absolute URL to the PDF
  downloadLabel: string;   // button text, e.g. "Download the Pitch Decoder"
  preHeader: string;
  unsubscribeUrl: string;
}): string {
  const {
    firstName,
    kicker,
    title,
    subtitle,
    intro,
    downloadUrl,
    downloadLabel,
    preHeader,
    unsubscribeUrl,
  } = params;

  const pad = Array(60).fill("‌ ").join("");
  const bookUrl = "https://waypointfranchise.com/book";

  const introHtml = intro
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#3a3a3a;line-height:1.8;">${esc(p)}</p>`
    )
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
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:#FAF8F4;line-height:1.3;">${esc(title)}</p>
    <p style="margin:8px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:rgba(250,248,244,0.5);letter-spacing:0.5px;">${esc(subtitle)}</p>
  </td></tr>

  <!-- GREETING + INTRO -->
  <tr><td class="mpad" style="background-color:#F5F0E8;padding:28px 40px 0;">
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#8E3012;">${esc(kicker)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
      <tr><td style="height:2px;background-color:#CC6535;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <p style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;color:#1a1a1a;">Hi ${esc(firstName)},</p>
    ${introHtml}
  </td></tr>

  <!-- DOWNLOAD BUTTON -->
  <tr><td class="mpad" style="background-color:#F5F0E8;padding:8px 40px 36px;text-align:center;">
    <a href="${esc(downloadUrl)}" style="display:inline-block;background-color:#CC6535;color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:15px 34px;border-radius:3px;">${esc(downloadLabel)}</a>
    <p style="margin:14px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#9a9a8a;">Or paste this into your browser:<br><span style="color:#5a5a4a;">${esc(downloadUrl)}</span></p>
  </td></tr>

  <!-- SOFT CTA BAND -->
  <tr><td class="mpad" style="background-color:#122640;padding:30px 40px;text-align:center;">
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:normal;color:#FAF8F4;line-height:1.4;">If you want a second set of eyes on what you find, I do this for a living.</p>
    <a href="${esc(bookUrl)}" style="display:inline-block;background-color:transparent;color:#FAF8F4;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:12px 28px;border:1px solid rgba(250,248,244,0.4);border-radius:3px;">Book a Free Call</a>
    <p style="margin:14px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:rgba(250,248,244,0.45);">No cost. No obligation.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td class="mpad" style="background-color:#0c1929;padding:22px 40px 26px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;color:rgba(250,248,244,0.65);">Kelsey, Waypoint Franchise Advisors</p>
    <p style="margin:0 0 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(250,248,244,0.35);">P.O. Box 3421, Whitefish, MT 59937 &bull; waypointfranchise.com</p>
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(250,248,244,0.3);line-height:1.6;">
      You requested this from Waypoint Franchise Advisors.<br>
      <a href="${esc(unsubscribeUrl)}" style="color:rgba(250,248,244,0.35);text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
