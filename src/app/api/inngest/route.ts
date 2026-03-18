import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { leadHunterProcess, personalizerProcess, senderProcess, replyGuardianProcess, monitorProcess, contentRefreshFunction, warmupScheduler, tidycalBookingSync, linkedInDmQueue, ghostRecoveryAlert } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [leadHunterProcess, personalizerProcess, senderProcess, replyGuardianProcess, monitorProcess, contentRefreshFunction, warmupScheduler, tidycalBookingSync, linkedInDmQueue, ghostRecoveryAlert],
});
