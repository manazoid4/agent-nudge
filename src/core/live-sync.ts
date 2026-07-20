import { createHash } from "node:crypto";
import type {
  AgentSession,
  Nudge,
  PathClaim,
  PeerPresence,
} from "./schemas.js";

export const ACTIVE_SESSION_TTL_MS = 5 * 60_000;

export function normalizeClaimPath(path: string) {
  return path
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function isSessionPresent(
  session: AgentSession,
  now = new Date(),
  ttlMs = ACTIVE_SESSION_TTL_MS,
) {
  if (session.status !== "active") return false;
  const lastSeen = Date.parse(session.lastSeenAt);
  return Number.isFinite(lastSeen) && now.getTime() - lastSeen <= ttlMs;
}

export function toPeerPresence(session: AgentSession): PeerPresence {
  return {
    sessionId: session.id,
    provider: session.provider,
    lastSeenAt: session.lastSeenAt,
    task: session.activeTask,
  };
}

export function liveSyncStatus(nudges: Nudge[]) {
  const active = nudges.filter((nudge) =>
    ["queued", "delivered", "snoozed"].includes(nudge.state),
  );
  if (active.some((nudge) => nudge.deliveryClass === "BLOCK")) return "HOLD";
  return active.length ? "REVIEW" : "CLEAR";
}

export function buildLiveSyncDigest(input: {
  projectId: string;
  recipientSessionId: string;
  peers: PeerPresence[];
  nudges: Nudge[];
  claims: PathClaim[];
}) {
  const stable = {
    projectId: input.projectId,
    recipientSessionId: input.recipientSessionId,
    peers: input.peers
      .map((peer) => ({
        sessionId: peer.sessionId,
        provider: peer.provider,
        lastSeenAt: peer.lastSeenAt,
        task: peer.task,
      }))
      .sort((a, b) => a.sessionId.localeCompare(b.sessionId)),
    nudges: input.nudges
      .map((nudge) => ({
        dedupeKey: nudge.dedupeKey,
        state: nudge.state,
        deliveryClass: nudge.deliveryClass,
      }))
      .sort((a, b) => a.dedupeKey.localeCompare(b.dedupeKey)),
    claims: input.claims
      .map((claim) => ({
        id: claim.id,
        sessionId: claim.sessionId,
        pathKey: claim.pathKey,
        state: claim.state,
        leaseExpiresAt: claim.leaseExpiresAt,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
