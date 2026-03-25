import { NextResponse } from "next/server";
import { subscribeToBeehiiv } from "@/lib/beehiiv";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await subscribeToBeehiiv(email.trim(), name?.trim() || undefined);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[newsletter-subscribe]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
