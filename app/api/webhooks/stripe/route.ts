import { db } from "@/lib/db";
import { API } from "@/lib/safe-api-message";
import { getStripe } from "@/lib/stripe";
import { syncArivixRipDiscordRolesForUserId } from "@/lib/sync-arivix-privilege-roles";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(API.unavailable, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await db.processedStripeEvent.create({ data: { id: event.id } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object as Stripe.Checkout.Session;
        const userId = sess.metadata?.userId;
        const customerId =
          typeof sess.customer === "string"
            ? sess.customer
            : sess.customer?.id;
        if (userId && customerId) {
          const paid =
            sess.payment_status === "paid" ||
            sess.payment_status === "no_payment_required";
          await db.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              ...(sess.mode === "payment" && paid
                ? { lifetimePremiumAt: new Date() }
                : {}),
            },
          });
          await syncArivixRipDiscordRolesForUserId(userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const existing = await db.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { userId: true },
        });
        const periodEndSec = subscriptionPeriodEndUnix(sub);
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: "canceled",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: new Date(periodEndSec * 1000),
          },
        });
        if (existing?.userId) {
          await syncArivixRipDiscordRolesForUserId(existing.userId);
        }
        break;
      }
      default:
        break;
    }
  } catch {
    console.error("[stripe webhook] handler failed");
    return NextResponse.json(API.unavailable, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Stripe API versions may expose period end on items, not the subscription root. */
function subscriptionPeriodEndUnix(sub: Stripe.Subscription): number {
  const fromItem = sub.items.data[0]?.current_period_end;
  if (typeof fromItem === "number") return fromItem;
  const legacy = (sub as { current_period_end?: number }).current_period_end;
  if (typeof legacy === "number") return legacy;
  return Math.floor(Date.now() / 1000);
}

async function syncSubscription(sub: Stripe.Subscription) {
  let userId = sub.metadata?.userId ?? null;
  if (!userId) {
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (!customerId) return;
    const user = await db.user.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!user) return;
    userId = user.id;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  if (!priceId) return;

  const periodEndSec = subscriptionPeriodEndUnix(sub);

  const stale = await db.subscription.findFirst({
    where: { userId, stripeSubscriptionId: { not: sub.id } },
  });
  if (stale) {
    await db.subscription.delete({ where: { id: stale.id } });
  }

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status: sub.status,
      currentPeriodEnd: new Date(periodEndSec * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripePriceId: priceId,
      status: sub.status,
      currentPeriodEnd: new Date(periodEndSec * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  await syncArivixRipDiscordRolesForUserId(userId);
}
