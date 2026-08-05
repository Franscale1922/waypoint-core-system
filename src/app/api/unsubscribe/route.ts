/**
 * Opt-out endpoint for checklist readiness downloads.
 *
 * All six unsubscribe routes were byte-identical apart from the model name, and
 * all six mutated on GET. Both problems are fixed in one place now. See
 * src/lib/unsubscribe-route.ts for why GET only asks and POST is what acts.
 */
import { createUnsubscribeRoute } from "@/lib/unsubscribe-route";

export const { GET, POST } = createUnsubscribeRoute({
  model: "checklistDownload",
  label: "[unsubscribe]",
});
