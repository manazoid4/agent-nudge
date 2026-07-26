import type { IncomingMessage, ServerResponse } from "node:http";
import { createBillingPortal } from "../src/commerce/stripe.js";
import { publicOrigin, readBody, sendJson } from "../src/commerce/http.js";

export const config = { api: { bodyParser: false } };

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  if (request.method !== "POST")
    return sendJson(response, 405, { error: "method_not_allowed" });
  try {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      sessionId?: string;
    };
    if (!body.sessionId)
      return sendJson(response, 400, { error: "session_id_required" });
    return sendJson(
      response,
      200,
      await createBillingPortal(body.sessionId, publicOrigin()),
    );
  } catch (error) {
    return sendJson(response, 400, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
