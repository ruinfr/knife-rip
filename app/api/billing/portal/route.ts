import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getStripe, siteOrigin } from "@/lib/stripe";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) {
    return NextResponse.redirect(`${siteOrigin()}/pricing`);
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${siteOrigin()}/dashboard`,
  });

  return NextResponse.redirect(portal.url);
}
