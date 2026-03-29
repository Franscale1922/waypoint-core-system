/**
 * crm.ts — Outbound CRM notification helper
 *
 * Pushes a lead record into the Waypoint CRM (Supabase Edge Function)
 * whenever a prospect engages with the website.
 *
 * Design rules:
 *   - Fire-and-forget: never await at the call site, never blocks the response.
 *   - Never throws: errors are caught and logged internally.
 *   - Skips Kelsey's own address (test submissions).
 *   - No-ops silently when CRM_WEBHOOK_URL is not configured (local dev).
 *
 * Env var:
 *   CRM_WEBHOOK_URL  Full URL including the ?key= query param.
 *   Example: https://heqeszxshfbkyjcbbgzi.supabase.co/functions/v1/receive-webhook-lead?key=YOUR_KEY
 *
 * CRM payload schema (per webhook integration docs):
 *   Required: name
 *   Optional: email, phone, source, notes
 */

const KELSEY_EMAIL = "kelsey@waypointfranchise.com";

export interface CrmLeadPayload {
  name: string;
  email?: string;
  phone?: string;
  /** Identifies the touchpoint — shown in CRM event log. */
  source: string;
  /** Extra context (score, archetype, checklist type, etc.). */
  notes?: string;
}

/**
 * Push a lead to the CRM. Call without await — it resolves in the background.
 *
 * @example
 *   notifyCrm({ name, email, source: "Contact Form", notes: message });
 */
export function notifyCrm(payload: CrmLeadPayload): void {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;

  // Silently no-op in local dev when the env var isn't set.
  if (!webhookUrl) return;

  // Never send Kelsey's own test submissions to the CRM.
  if (payload.email?.toLowerCase() === KELSEY_EMAIL.toLowerCase()) return;

  // Fire-and-forget — intentionally not awaited.
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) {
        res.text().then((text) =>
          console.error(`[crm] Webhook responded ${res.status}: ${text}`)
        );
      }
    })
    .catch((err) => {
      console.error("[crm] Webhook fetch failed:", err);
    });
}
