import { createPrivateKey, sign } from "node:crypto";
import Stripe from "stripe";
import type { LicensePayload } from "../licensing/index.js";

const PRO_ENTITLEMENTS: LicensePayload["entitlements"] = [
  "managed_workspaces",
  "automatic_drift",
  "custom_profiles",
  "changelog_write",
  "agent_launch",
];

export function stripeClient(secret = required("STRIPE_SECRET_KEY")) {
  return new Stripe(secret, { maxNetworkRetries: 2, timeout: 10_000 });
}

export async function createProCheckout(
  origin: string,
  stripe = stripeClient(),
  priceId = required("STRIPE_PRO_PRICE_ID"),
) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#license`,
    cancel_url: `${origin}/?checkout=cancelled#pricing`,
    subscription_data: { metadata: { product: "agent-nudge-pro" } },
  });
  if (!session.url) throw new Error("stripe_checkout_url_missing");
  return { url: session.url, id: session.id };
}

export async function createBillingPortal(
  checkoutSessionId: string,
  origin: string,
) {
  const stripe = stripeClient();
  const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const customer =
    typeof checkout.customer === "string"
      ? checkout.customer
      : checkout.customer?.id;
  if (!customer) throw new Error("stripe_customer_missing");
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${origin}/#demo`,
  });
  return { url: session.url };
}

export async function issueLicenseForCheckout(checkoutSessionId: string) {
  const stripe = stripeClient();
  const checkout = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });
  const subscription =
    typeof checkout.subscription === "object" ? checkout.subscription : null;
  if (
    checkout.payment_status !== "paid" ||
    !subscription ||
    !["active", "trialing"].includes(subscription.status)
  )
    throw new Error("subscription_not_active");
  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  const payload: LicensePayload = {
    version: 1,
    licenseId: `an_${checkout.id}`,
    plan: "pro",
    entitlements: PRO_ENTITLEMENTS,
    issuedAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  return { token: signLicensePayload(payload), payload };
}

export function verifyStripeWebhook(rawBody: Buffer, signature: string) {
  return stripeClient().webhooks.constructEvent(
    rawBody,
    signature,
    required("STRIPE_WEBHOOK_SECRET"),
  );
}

export function signLicensePayload(payload: LicensePayload) {
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const privateKey = createPrivateKey(
    required("AGENT_NUDGE_LICENSE_PRIVATE_KEY").replaceAll("\\n", "\n"),
  );
  const signature = sign(null, Buffer.from(payloadPart), privateKey);
  return `${payloadPart}.${signature.toString("base64url")}`;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}
