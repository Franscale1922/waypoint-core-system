/**
 * crm.ts: Outbound CRM notification helper
 *
 * Pushes a lead record into the Waypoint CRM (Supabase Edge Function)
 * whenever a prospect engages with the website.
 *
 * Design rules:
 *   - Schedule it with afterResponse() from @/lib/after-response, which runs it
 *     once the response is flushed without blocking delivery. It used to be a
 *     bare unawaited fetch ("never await at the call site"), but that is unsafe
 *     on Vercel: the invocation can be frozen when the response returns, so an
 *     unknown share of leads never reached the CRM at all. It therefore returns
 *     a promise now — it has to, or afterResponse has nothing to keep alive.
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
  /** Identifies the touchpoint: shown in CRM event log. */
  source: string;
  /** Extra context (score, archetype, checklist type, etc.). */
  notes?: string;
}

/**
 * Push a lead to the CRM. Resolves when the webhook call settles, and never
 * rejects. Schedule it rather than awaiting it inline, so it does not delay the
 * response:
 *
 * @example
 *   afterResponse("[contact] CRM sync", () =>
 *     notifyCrm({ name, email, source: "Contact Form", notes: message })
 *   );
 */
export async function notifyCrm(payload: CrmLeadPayload): Promise<void> {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;

  // Silently no-op in local dev when the env var isn't set.
  if (!webhookUrl) return;

  // Never send Kelsey's own test submissions to the CRM.
  if (payload.email?.toLowerCase() === KELSEY_EMAIL.toLowerCase()) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[crm] Webhook responded ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("[crm] Webhook fetch failed:", err);
  }
}
