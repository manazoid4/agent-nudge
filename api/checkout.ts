import type { IncomingMessage, ServerResponse } from "node:http";
import { createProCheckout } from "../src/commerce/stripe.js";
import { publicOrigin, sendJson } from "../src/commerce/http.js";

export const config = { api: { bodyParser: false } };

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST")
    return sendJson(response, 405, { error: "method_not_allowed" });
  try {
    return sendJson(response, 200, await createProCheckout(publicOrigin()));
  } catch (error) {
    return sendJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
