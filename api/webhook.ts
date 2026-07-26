import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyStripeWebhook } from "../src/commerce/stripe.js";
import { readBody, sendJson } from "../src/commerce/http.js";

export const config = { api: { bodyParser: false } };

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST")
    return sendJson(response, 405, { error: "method_not_allowed" });
  const signature = request.headers["stripe-signature"];
  if (typeof signature !== "string")
    return sendJson(response, 400, { error: "stripe_signature_required" });
  try {
    const event = verifyStripeWebhook(await readBody(request), signature);
    return sendJson(response, 200, { received: true, eventId: event.id });
  } catch {
    return sendJson(response, 400, { error: "invalid_stripe_signature" });
  }
}
