/**
 * beehiiv.ts — Shared subscriber sync utility
 *
 * Adds a subscriber to the Waypoint beehiiv publication.
 * Fire-and-forget safe: all errors are caught and logged, never re-thrown.
 * Silently skips if BEEHIIV_API_KEY is not set (local dev without the key).
 */

const BEEHIIV_API_BASE = "https://api.beehiiv.com/v2";

export async function subscribeToBeehiiv(
  email: string,
  name?: string | null
): Promise<void> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

  if (!apiKey || !publicationId) {
    // Local dev without credentials — skip silently
    return;
  }

  const firstName = name ? name.split(" ")[0] : undefined;

  try {
    const res = await fetch(
      `${BEEHIIV_API_BASE}/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          ...(firstName ? { first_name: firstName } : {}),
          reactivate_existing: true,   // safe to call repeatedly — no duplicates
          send_welcome_email: false,   // Waypoint's own nurture handles welcome comms
          utm_source: "waypoint-crm",  // track origin in beehiiv analytics
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[beehiiv] Subscribe failed for ${email}: ${res.status} ${body}`);
      return;
    }

    console.log(`[beehiiv] Subscribed: ${email}`);
  } catch (err) {
    console.error(`[beehiiv] Unexpected error for ${email}:`, err);
  }
}
