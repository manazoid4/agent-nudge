import type { IncomingMessage, ServerResponse } from "node:http";

export async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 256 * 1024) throw new Error("request_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

export function publicOrigin() {
  const value =
    process.env.PUBLIC_APP_URL ?? "https://agent-nudge-bay.vercel.app";
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1")
    throw new Error("invalid_public_site_url");
  return url.origin;
}
