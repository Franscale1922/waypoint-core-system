import { NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";
import { ArchetypeSchema } from "@/app/lib/schemas";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Kelsey Stuart <kelsey@waypointfranchise.com>";

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

    // ── 2. Send confirmation email ─────────────────────────────────────────────
    const strongFitsText = strongFits.join(", ");
    const weakFitsText = weakFits.join(", ");

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your Franchise Archetype: ${archetypeName}`,
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
          <p>If you'd like to talk through what this means for your specific situation — and which specific brands match your profile — I'm happy to do that. It's free, and franchise brands pay the advisory fee, not you.</p>
          <p style="margin-top: 24px;">
            <a href="https://waypointfranchise.com/book" style="background: #d4a55a; color: #0c1929; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Book a Free Call</a>
          </p>
          <p style="margin-top: 28px; color: #888; font-size: 14px;">— Kelsey<br/>Waypoint Franchise Advisors</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="font-size: 11px; color: #aaa;">You received this because you completed the Franchise Archetype Quiz at waypointfranchise.com. <a href="https://waypointfranchise.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #aaa;">Unsubscribe</a></p>
        </div>
      `,
      text: `Your Franchise Archetype: ${archetypeName}\n\n${name.split(" ")[0]},\n\nBased on how you answered, your franchise archetype is ${archetypeName}.\n\nIndustries that tend to fit you: ${strongFitsText}\nIndustries that often don't align: ${weakFitsText}\n\nIf you'd like to talk through what this means — book a free call at waypointfranchise.com/book\n\n— Kelsey\nWaypoint Franchise Advisors`,
      tags: [{ name: "sequence", value: "archetype-email-1" }],
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      archetype,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[archetype-complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
