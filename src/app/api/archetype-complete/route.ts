import { NextResponse } from "next/server";
import { notifyCrm } from "@/lib/crm";
import { Resend } from "resend";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { ArchetypeSchema } from "@/app/lib/schemas";

const resend = new Resend(process.env.RESEND_API_KEY);
// FROM uses the verified mail.waypointfranchise.com subdomain (apex is reserved for Google Workspace receiving).
// REPLY_TO uses the apex so any replies land in Kelsey's Gmail inbox.
const FROM = "Kelsey Stuart <kelsey@mail.waypointfranchise.com>";
const REPLY_TO = "kelsey@waypointfranchise.com";

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = ArchetypeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, archetype, archetypeName, strongFits, weakFits } = parsed.data;

    // ── 1. Upsert lead in DB ──────────────────────────────────────────────────
    const existing = await prisma.lead.findFirst({ where: { email } });

    const lead = existing
      ? await prisma.lead.update({
          where: { id: existing.id },
          data: {
            franchiseAngle: `Archetype: ${archetypeName} | Fits: ${strongFits.slice(0, 2).join(", ")}`,
            status: "SEQUENCED",
          },
        })
      : await prisma.lead.create({
          data: {
            name,
            email,
            franchiseAngle: `Archetype: ${archetypeName} | Fits: ${strongFits.slice(0, 2).join(", ")}`,
            status: "SEQUENCED",
          },
        });

    // ── 2. CRM sync — fire-and-forget ─────────────────────────────────────────
    notifyCrm({
      name,
      email,
      source: "Franchise Archetype Quiz",
      notes: `Archetype: ${archetypeName} | Strong fits: ${strongFits.slice(0, 3).join(", ")}`,
    });

    // ── 2b. Deduplicate: only start a new nurture sequence if none is active ──
    // Mirrors scorecard pattern. Prevents double-emails if someone retakes the
    // quiz. "Active" = not completed and not unsubscribed.
    const activeSubmission = await (prisma as any).archetypeSubmission.findFirst({
      where: {
        email,
        nurtureCompletedAt: null,
        unsubscribed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    let submission = activeSubmission;
    let sequenceStarted = false;

    if (!activeSubmission) {
      submission = await (prisma as any).archetypeSubmission.create({
        data: {
          email,
          name,
          archetype,
          archetypeName,
          strongFits,
          weakFits,
          nurtureStep: 1,
        },
      });

      await inngest.send({
        name: "nurture/archetype.complete",
        data: {
          submissionId: submission.id,
          email,
          name,
          archetype,
        },
      });

      sequenceStarted = true;
    } else {
      // Update archetype on existing submission (they retook the quiz)
      await (prisma as any).archetypeSubmission.update({
        where: { id: activeSubmission.id },
        data: { archetype, archetypeName, strongFits, weakFits },
      });
    }

    // ── 3. Send confirmation email (Day 0) ───────────────────────────────────
    // Uses HMAC unsubscribe URL keyed to the archetypeSubmission.id so the
    // unsubscribe link is signed and 1-click compliant. Mirrors scorecard pattern.
    const strongFitsText = strongFits.join(", ");
    const weakFitsText = weakFits.join(", ");

    const unsubscribeUrl = (() => {
      const secret = process.env.UNSUBSCRIBE_SECRET;
      if (!secret) return "https://www.waypointfranchise.com/unsubscribe";
      const crypto = require("crypto");
      const token = crypto.createHmac("sha256", secret).update(submission.id).digest("hex");
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.waypointfranchise.com";
      return `${base}/api/archetype-unsubscribe?id=${submission.id}&token=${token}`;
    })();

    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: email,
      subject: `Your Franchise Archetype: ${archetypeName}`,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p style="font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Your Franchise Archetype</p>
          <h1 style="font-size: 28px; margin: 0 0 8px; color: #1b3a5f;">${archetypeName}</h1>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
          <p>${name.split(" ")[0]},</p>
          <p>Based on how you answered, your franchise archetype is <strong>${archetypeName}</strong>.</p>
          <p style="margin: 20px 0 8px; font-weight: bold; color: #1b3a5f;">Industries that tend to fit you:</p>
          <p style="color: #2d7a4f;">${strongFitsText}</p>
          <p style="margin: 20px 0 8px; font-weight: bold; color: #1b3a5f;">Industries that often don't align:</p>
          <p style="color: #888;">${weakFitsText}</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p>I'll follow up over the next week with a few more notes specific to your archetype. If you want to skip ahead and talk through what this means for your situation, my calendar is open.</p>
          <p style="margin-top: 24px;">
            <a href="https://waypointfranchise.com/book" style="background: #CC6535; color: #0c1929; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Book a Free Call</a>
          </p>
          <p style="margin-top: 28px; color: #888; font-size: 14px;">— Kelsey<br/>Waypoint Franchise Advisors</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="font-size: 11px; color: #aaa;">Waypoint Franchise Advisors · P.O. Box 3421, Whitefish, MT 59937. You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="${unsubscribeUrl}" style="color: #aaa;">Unsubscribe</a></p>
        </div>
      `,
      text: `Your Franchise Archetype: ${archetypeName}\n\n${name.split(" ")[0]},\n\nBased on how you answered, your franchise archetype is ${archetypeName}.\n\nIndustries that tend to fit you: ${strongFitsText}\nIndustries that often don't align: ${weakFitsText}\n\nI'll follow up over the next week with a few more notes specific to your archetype. If you want to skip ahead, book a free call at waypointfranchise.com/book.\n\n— Kelsey\nWaypoint Franchise Advisors\n\n---\nWaypoint Franchise Advisors\nP.O. Box 3421, Whitefish, MT 59937\nTo stop receiving these notes: ${unsubscribeUrl}`,
      tags: [{ name: "sequence", value: "archetype-email-1" }],
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      submissionId: submission.id,
      archetype,
      sequenceStarted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[archetype-complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
