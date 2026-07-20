import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { buildContextPack } from "../core/context-pack.js";
import { compileNudge, decideNudge } from "../core/engine.js";
import {
  buildLiveSyncDigest,
  isSessionPresent,
  liveSyncStatus,
  normalizeClaimPath,
  toPeerPresence,
} from "../core/live-sync.js";
import { buildPortfolioSummary } from "../core/portfolio.js";
import type {
  AcknowledgeRequest,
  AgentEvent,
  AgentSession,
  ChangeLogEntry,
  CheckInInput,
  ClaimRequest,
  ContextFact,
  Nudge,
  PathClaim,
  PublishFactInput,
  ReleaseClaimRequest,
  SyncRequest,
  SyncResponse,
  TaskRecord,
} from "../core/schemas.js";

type StoredKind =
  | "sessions"
  | "tasks"
  | "events"
  | "facts"
  | "nudges"
  | "claims"
  | "feedback"
  | "manifests";

export class NudgeDatabase {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        kind TEXT NOT NULL,
        id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        state TEXT,
        created_at TEXT NOT NULL,
        idempotency_key TEXT,
        payload TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_event_idempotency
        ON records(kind, idempotency_key) WHERE idempotency_key IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_records_project_kind
        ON records(project_id, kind, created_at DESC);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS change_log (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_change_log_project_sequence
        ON change_log(project_id, sequence);
      PRAGMA user_version = 2;
    `);
  }

  private appendChange(
    projectId: string,
    entityType: ChangeLogEntry["entityType"],
    entityId: string,
    action: string,
    at = new Date().toISOString(),
  ) {
    const result = this.db
      .prepare(
        "INSERT INTO change_log(project_id, entity_type, entity_id, action, at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(projectId, entityType, entityId, action, at);
    return Number(result.lastInsertRowid);
  }

  put(
    kind: StoredKind,
    value: {
      id: string;
      projectId?: string;
      state?: string;
      createdAt?: string;
      startedAt?: string;
      at?: string;
      idempotencyKey?: string;
    },
  ) {
    const statement = this.db.prepare(`
      INSERT INTO records(kind, id, project_id, state, created_at, idempotency_key, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(kind, id) DO UPDATE SET
        project_id = excluded.project_id,
        state = excluded.state,
        payload = excluded.payload
    `);
    statement.run(
      kind,
      value.id,
      value.projectId ?? "system",
      value.state ?? null,
      value.createdAt ??
        value.startedAt ??
        value.at ??
        new Date().toISOString(),
      value.idempotencyKey ?? null,
      JSON.stringify(value),
    );
    return value;
  }

  putEvent(value: AgentEvent): { inserted: boolean } {
    try {
      this.put("events", { ...value, createdAt: value.receivedAt });
      return { inserted: true };
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed"))
        return { inserted: false };
      throw error;
    }
  }

  list<T>(kind: StoredKind, projectId?: string): T[] {
    const rows = projectId
      ? this.db
          .prepare(
            "SELECT payload FROM records WHERE kind = ? AND project_id = ? ORDER BY created_at DESC",
          )
          .all(kind, projectId)
      : this.db
          .prepare(
            "SELECT payload FROM records WHERE kind = ? ORDER BY created_at DESC",
          )
          .all(kind);
    return rows.map(
      (row) => JSON.parse(String((row as { payload: string }).payload)) as T,
    );
  }

  get<T>(kind: StoredKind, id: string): T | undefined {
    const row = this.db
      .prepare("SELECT payload FROM records WHERE kind = ? AND id = ?")
      .get(kind, id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as T) : undefined;
  }

  updateNudge(id: string, patch: Partial<Nudge>): Nudge {
    const current = this.get<Nudge>("nudges", id);
    if (!current) throw new Error(`Nudge not found: ${id}`);
    return this.put("nudges", { ...current, ...patch }) as Nudge;
  }

  checkIn(input: CheckInInput, now = new Date()): AgentSession {
    const at = now.toISOString();
    const current = this.get<AgentSession>("sessions", input.sessionId);
    if (current && current.projectId !== input.projectId)
      throw new Error("session_project_mismatch");
    const session: AgentSession = {
      id: input.sessionId,
      schemaVersion: 1,
      provider: input.provider,
      projectId: input.projectId,
      projectName: input.projectName,
      cwd: input.cwd,
      startedAt: current?.startedAt ?? at,
      lastSeenAt: at,
      status: "active",
      activeTask: input.task ?? current?.activeTask,
      extensionMetadata: current?.extensionMetadata ?? {},
    };
    this.put("sessions", session);
    this.appendChange(input.projectId, "session", session.id, "checked_in", at);
    if (session.activeTask) {
      const task: TaskRecord = {
        id: session.id,
        schemaVersion: 1,
        projectId: session.projectId,
        sessionId: session.id,
        ...session.activeTask,
        updatedAt: at,
      };
      this.put("tasks", { ...task, createdAt: at });
      this.appendChange(input.projectId, "task", task.id, "updated", at);
    }
    return session;
  }

  heartbeat(
    projectId: string,
    sessionId: string,
    task?: CheckInInput["task"],
    now = new Date(),
  ) {
    const current = this.requireSession(projectId, sessionId);
    return this.checkIn(
      {
        sessionId,
        projectId,
        projectName: current.projectName,
        provider: current.provider,
        cwd: current.cwd,
        task: task ?? current.activeTask,
      },
      now,
    );
  }

  publishFact(input: PublishFactInput, now = new Date()) {
    this.requireSession(input.projectId, input.authorSessionId);
    const at = now.toISOString();
    const semanticSource = JSON.stringify({
      projectId: input.projectId,
      authorSessionId: input.authorSessionId,
      kind: input.kind,
      title: input.title,
      summary: input.summary,
      paths: input.paths,
      tags: input.tags,
    });
    const sourceHash = createHash("sha256")
      .update(semanticSource)
      .digest("hex");
    const fact: ContextFact = {
      id: `fact-${sourceHash.slice(0, 32)}`,
      schemaVersion: 1,
      projectId: input.projectId,
      authorSessionId: input.authorSessionId,
      kind: input.kind,
      title: input.title,
      summary: input.summary,
      paths: input.paths,
      tags: input.tags,
      sourceRefs: [
        {
          type: "manual",
          label: input.sourceLabel,
          sessionId: input.authorSessionId,
          sourceHash,
        },
      ],
      confidence: input.confidence,
      createdAt: at,
      effectiveAt: at,
      expiresAt: input.expiresAt,
      contradictsFactIds: [],
      dependsOnFactIds: [],
      invalidatesFactIds: [],
      sensitivity: "normal",
      extensionMetadata: {},
    };
    return this.recordAndFanOutFact(fact, now);
  }

  recordAndFanOutFact(fact: ContextFact, now = new Date()) {
    this.requireSession(fact.projectId, fact.authorSessionId);
    const existing = this.get<ContextFact>("facts", fact.id);
    if (existing) {
      return {
        fact: existing,
        nudges: this.list<Nudge>("nudges", fact.projectId).filter(
          (nudge) => nudge.factId === fact.id,
        ),
      };
    }
    this.put("facts", fact);
    this.appendChange(
      fact.projectId,
      "fact",
      fact.id,
      "published",
      now.toISOString(),
    );
    const nudges = this.fanOutFact(fact, now);
    return { fact, nudges };
  }

  acquireClaim(input: ClaimRequest, now = new Date()) {
    const owner = this.requireSession(input.projectId, input.sessionId);
    this.expireClaims(input.projectId, now);
    const pathKey = normalizeClaimPath(input.path);
    const claims = this.list<PathClaim>("claims", input.projectId);
    const sameOwner = claims.find(
      (claim) =>
        claim.state === "active" &&
        claim.sessionId === input.sessionId &&
        claim.pathKey === pathKey,
    );
    const leaseExpiresAt = new Date(
      now.getTime() + input.leaseSeconds * 1000,
    ).toISOString();
    if (sameOwner) {
      const renewed: PathClaim = { ...sameOwner, leaseExpiresAt };
      this.put("claims", renewed);
      this.appendChange(
        input.projectId,
        "claim",
        renewed.id,
        "renewed",
        now.toISOString(),
      );
      return { acquired: true as const, claim: renewed };
    }
    const conflict = claims.find(
      (claim) =>
        claim.state === "active" &&
        claim.sessionId !== input.sessionId &&
        claim.pathKey === pathKey &&
        Date.parse(claim.leaseExpiresAt) > now.getTime(),
    );
    if (conflict) {
      const fact = this.get<ContextFact>("facts", conflict.factId);
      if (fact) {
        const recipient: AgentSession = {
          ...owner,
          activeTask: {
            summary: owner.activeTask?.summary ?? `Working on ${input.path}`,
            paths: Array.from(
              new Set([...(owner.activeTask?.paths ?? []), input.path]),
            ),
            tags: owner.activeTask?.tags ?? [],
          },
        };
        this.ensureNudge(fact, recipient, now);
      }
      return { acquired: false as const, conflict };
    }

    const id = `claim-${randomUUID()}`;
    const claim: PathClaim = {
      id,
      schemaVersion: 1,
      projectId: input.projectId,
      sessionId: input.sessionId,
      path: input.path,
      pathKey,
      state: "active",
      acquiredAt: now.toISOString(),
      leaseExpiresAt,
      factId: `fact-${id}`,
    };
    this.put("claims", { ...claim, createdAt: claim.acquiredAt });
    this.appendChange(
      input.projectId,
      "claim",
      claim.id,
      "acquired",
      now.toISOString(),
    );
    const fact: ContextFact = {
      id: claim.factId,
      schemaVersion: 1,
      projectId: input.projectId,
      authorSessionId: input.sessionId,
      kind: "claim",
      title: `${owner.provider} is editing ${input.path}`.slice(0, 160),
      summary:
        "Another active agent holds a write lease for this path. Coordinate before editing.",
      paths: [input.path],
      tags: owner.activeTask?.tags ?? [],
      sourceRefs: [
        {
          type: "manual",
          label: "Agent Nudge path lease",
          filePath: input.path,
          sessionId: input.sessionId,
          sourceHash: createHash("sha256")
            .update(
              `${input.projectId}:${input.sessionId}:${pathKey}:${claim.acquiredAt}`,
            )
            .digest("hex"),
        },
      ],
      confidence: 1,
      createdAt: claim.acquiredAt,
      effectiveAt: claim.acquiredAt,
      expiresAt: claim.leaseExpiresAt,
      contradictsFactIds: [],
      dependsOnFactIds: [],
      invalidatesFactIds: [],
      sensitivity: "normal",
      extensionMetadata: {},
    };
    this.recordAndFanOutFact(fact, now);
    return { acquired: true as const, claim };
  }

  releaseClaim(input: ReleaseClaimRequest, now = new Date()) {
    const session = this.requireSession(input.projectId, input.sessionId);
    const current = this.get<PathClaim>("claims", input.claimId);
    if (!current || current.projectId !== input.projectId)
      throw new Error("claim_not_found");
    if (current.sessionId !== session.id) throw new Error("claim_not_owned");
    if (current.state !== "active") return current;
    const at = now.toISOString();
    const released: PathClaim = {
      ...current,
      state: "released",
      releasedAt: at,
      leaseExpiresAt: at,
    };
    this.put("claims", released);
    this.appendChange(input.projectId, "claim", current.id, "released", at);
    this.clearClaimNudges(current.factId, input.projectId, "superseded", at);
    const fact = this.get<ContextFact>("facts", current.factId);
    if (fact) {
      const expiredFact: ContextFact = { ...fact, expiresAt: at };
      this.put("facts", expiredFact);
    }
    return released;
  }

  acknowledge(input: AcknowledgeRequest, now = new Date()) {
    this.requireSession(input.projectId, input.sessionId);
    const nudge = this.get<Nudge>("nudges", input.nudgeId);
    if (!nudge || nudge.projectId !== input.projectId)
      throw new Error("nudge_not_found");
    if (nudge.recipientSessionId !== input.sessionId)
      throw new Error("nudge_not_owned");
    const updated = this.updateNudge(input.nudgeId, {
      state: "acknowledged",
      acknowledgedAt: now.toISOString(),
    });
    this.appendChange(
      input.projectId,
      "nudge",
      input.nudgeId,
      "acknowledged",
      now.toISOString(),
    );
    return updated;
  }

  sync(input: SyncRequest, now = new Date()): SyncResponse {
    this.requireSession(input.projectId, input.sessionId);
    this.expireClaims(input.projectId, now);
    const sessions = this.list<AgentSession>("sessions", input.projectId);
    const peers = sessions
      .filter(
        (session) =>
          session.id !== input.sessionId && isSessionPresent(session, now),
      )
      .map(toPeerPresence)
      .sort((a, b) => a.sessionId.localeCompare(b.sessionId));
    const nudges = this.list<Nudge>("nudges", input.projectId)
      .filter(
        (nudge) =>
          nudge.recipientSessionId === input.sessionId &&
          ["queued", "delivered", "snoozed"].includes(nudge.state) &&
          Date.parse(nudge.expiresAt) > now.getTime(),
      )
      .sort((a, b) => a.dedupeKey.localeCompare(b.dedupeKey));
    const claims = this.list<PathClaim>("claims", input.projectId)
      .filter(
        (claim) =>
          claim.state === "active" &&
          Date.parse(claim.leaseExpiresAt) > now.getTime(),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const changes = this.listChanges(input.projectId, input.cursor);
    const cursor = changes.at(-1)?.sequence ?? input.cursor;
    return {
      schemaVersion: 1,
      projectId: input.projectId,
      recipientSessionId: input.sessionId,
      generatedAt: now.toISOString(),
      cursor,
      digest: buildLiveSyncDigest({
        projectId: input.projectId,
        recipientSessionId: input.sessionId,
        peers,
        nudges,
        claims,
      }),
      status: liveSyncStatus(nudges),
      peers,
      nudges,
      claims,
      changes,
    };
  }

  private requireSession(projectId: string, sessionId: string) {
    const session = this.get<AgentSession>("sessions", sessionId);
    if (!session) throw new Error("session_not_found");
    if (session.projectId !== projectId)
      throw new Error("session_project_mismatch");
    return session;
  }

  private fanOutFact(fact: ContextFact, now: Date) {
    return this.list<AgentSession>("sessions", fact.projectId)
      .filter(
        (session) =>
          session.id !== fact.authorSessionId && isSessionPresent(session, now),
      )
      .map((session) => this.ensureNudge(fact, session, now))
      .filter((nudge): nudge is Nudge => Boolean(nudge));
  }

  private ensureNudge(
    fact: ContextFact,
    recipient: AgentSession,
    now: Date,
  ): Nudge | undefined {
    const decision = decideNudge(fact, recipient, { now });
    if (decision.suppressed) return undefined;
    const compiled = compileNudge(fact, recipient, decision, now);
    const candidate: Nudge = {
      ...compiled,
      id: `nudge-${compiled.dedupeKey.slice(0, 32)}`,
      correlationId: `corr-${compiled.dedupeKey.slice(0, 24)}`,
      traceId: compiled.dedupeKey.slice(0, 32),
    };
    const existing = this.list<Nudge>("nudges", fact.projectId).find(
      (nudge) => nudge.dedupeKey === candidate.dedupeKey,
    );
    if (existing) return existing;
    this.put("nudges", candidate);
    this.appendChange(
      fact.projectId,
      "nudge",
      candidate.id,
      "queued",
      now.toISOString(),
    );
    return candidate;
  }

  private clearClaimNudges(
    factId: string,
    projectId: string,
    state: "expired" | "superseded",
    at: string,
  ) {
    for (const nudge of this.list<Nudge>("nudges", projectId).filter(
      (item) =>
        item.factId === factId &&
        ["queued", "delivered", "snoozed"].includes(item.state),
    )) {
      this.updateNudge(nudge.id, { state });
      this.appendChange(projectId, "nudge", nudge.id, state, at);
    }
  }

  private expireClaims(projectId: string, now: Date) {
    const at = now.toISOString();
    for (const claim of this.list<PathClaim>("claims", projectId).filter(
      (item) =>
        item.state === "active" &&
        Date.parse(item.leaseExpiresAt) <= now.getTime(),
    )) {
      const expired: PathClaim = {
        ...claim,
        state: "expired",
        releasedAt: at,
      };
      this.put("claims", expired);
      this.appendChange(projectId, "claim", claim.id, "expired", at);
      this.clearClaimNudges(claim.factId, projectId, "expired", at);
    }
  }

  private listChanges(projectId: string, after: number): ChangeLogEntry[] {
    const rows = this.db
      .prepare(
        "SELECT sequence, project_id, entity_type, entity_id, action, at FROM change_log WHERE project_id = ? AND sequence > ? ORDER BY sequence ASC LIMIT 1000",
      )
      .all(projectId, after) as Array<{
      sequence: number;
      project_id: string;
      entity_type: ChangeLogEntry["entityType"];
      entity_id: string;
      action: string;
      at: string;
    }>;
    return rows.map((row) => ({
      sequence: row.sequence,
      projectId: row.project_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,
      at: row.at,
    }));
  }

  snapshot(projectId?: string) {
    const sessions = this.list<AgentSession>("sessions", projectId);
    const facts = this.list<ContextFact>("facts", projectId);
    const nudges = this.list<Nudge>("nudges", projectId);
    const events = this.list<AgentEvent>("events", projectId);
    return {
      sessions,
      tasks: this.list<TaskRecord>("tasks", projectId),
      facts,
      nudges,
      claims: this.list<PathClaim>("claims", projectId),
      events,
      metrics: {
        activeAgents: sessions.filter((item) => item.status === "active")
          .length,
        delivered: nudges.filter((item) => item.state !== "queued").length,
        acknowledged: nudges.filter((item) => item.state === "acknowledged")
          .length,
        conflictsPrevented: nudges.filter(
          (item) =>
            item.deliveryClass === "BLOCK" &&
            ["acknowledged", "delivered"].includes(item.state),
        ).length,
        queued: nudges.filter((item) => item.state === "queued").length,
      },
    };
  }

  contextPack(projectId: string, recipientSessionId?: string) {
    const snapshot = this.snapshot(projectId);
    return buildContextPack({
      projectId,
      recipientSessionId,
      sessions: snapshot.sessions,
      facts: snapshot.facts,
      nudges: snapshot.nudges,
    });
  }

  portfolioSummary() {
    return buildPortfolioSummary({
      sessions: this.list<AgentSession>("sessions"),
      facts: this.list<ContextFact>("facts"),
      nudges: this.list<Nudge>("nudges"),
      events: this.list<AgentEvent>("events"),
    });
  }

  seedScenario(data: {
    author: AgentSession;
    recipient: AgentSession;
    fact: ContextFact;
    nudge?: Nudge;
  }) {
    this.put("sessions", data.author);
    this.put("sessions", data.recipient);
    this.put("facts", data.fact);
    if (data.nudge) this.put("nudges", data.nudge);
  }

  exportAll() {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      ...this.snapshot(),
      feedback: this.list("feedback"),
      manifests: this.list("manifests"),
    };
  }

  purgePreview() {
    return (
      [
        "sessions",
        "tasks",
        "events",
        "facts",
        "nudges",
        "claims",
        "feedback",
        "manifests",
      ] as StoredKind[]
    ).map((kind) => ({ kind, count: this.list(kind).length }));
  }

  close() {
    this.db.close();
  }
}
