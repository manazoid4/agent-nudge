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
  | "evidence"
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
    this.appendChange(input.projectId, "session", session.id, "check-in", at);
    if (input.task) this.updateTask(input.projectId, input.sessionId, input.task, now);
    return session;
  }

  heartbeat(
    projectId: string,
    sessionId: string,
    task?: CheckInInput["task"],
    now = new Date(),
  ): AgentSession {
    const current = this.requireSession(projectId, sessionId);
    const session: AgentSession = {
      ...current,
      lastSeenAt: now.toISOString(),
      status: "active",
      activeTask: task ?? current.activeTask,
    };
    this.put("sessions", session);
    this.appendChange(projectId, "session", sessionId, "heartbeat", now.toISOString());
    if (task) this.updateTask(projectId, sessionId, task, now);
    return session;
  }

  updateTask(
    projectId: string,
    sessionId: string,
    task: NonNullable<CheckInInput["task"]>,
    now = new Date(),
  ): TaskRecord {
    this.requireSession(projectId, sessionId);
    const record: TaskRecord = {
      id: `task-${sessionId}`,
      schemaVersion: 1,
      projectId,
      sessionId,
      summary: task.summary,
      paths: task.paths,
      tags: task.tags,
      updatedAt: now.toISOString(),
    };
    this.put("tasks", { ...record, createdAt: record.updatedAt });
    this.appendChange(projectId, "task", record.id, "updated", record.updatedAt);
    return record;
  }

  publishFact(input: PublishFactInput, now = new Date()) {
    this.requireSession(input.projectId, input.authorSessionId);
    const timestamp = now.toISOString();
    const id = `fact-${randomUUID()}`;
    const sourceHash = createHash("sha256")
      .update(
        `${input.projectId}:${input.authorSessionId}:${input.kind}:${input.title}:${input.summary}:${timestamp}`,
      )
      .digest("hex");
    const fact: ContextFact = {
      id,
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
      createdAt: timestamp,
      effectiveAt: timestamp,
      expiresAt: input.expiresAt,
      contradictsFactIds: [],
      dependsOnFactIds: [],
      invalidatesFactIds: [],
      sensitivity: "normal",
      extensionMetadata: { ingestion: "live-sync-v1" },
    };
    return this.recordAndFanOutFact(fact);
  }

  recordAndFanOutFact(fact: ContextFact, now = new Date()) {
    const existing = this.get<ContextFact>("facts", fact.id);
    if (existing) return { fact: existing, nudges: [] as Nudge[], duplicate: true };
    this.requireSession(fact.projectId, fact.authorSessionId);
    this.put("facts", fact);
    this.appendChange(fact.projectId, "fact", fact.id, "published", fact.createdAt);
    const sessions = this.list<AgentSession>("sessions", fact.projectId);
    const nudges: Nudge[] = [];
    for (const recipient of sessions) {
      if (recipient.id === fact.authorSessionId || recipient.status === "ended") continue;
      const decision = decideNudge(fact, recipient, { now });
      if (decision.suppressed) continue;
      const nudge = compileNudge(fact, recipient, decision, now);
      const existingNudge = this.list<Nudge>("nudges", fact.projectId).find(
        (item) => item.dedupeKey === nudge.dedupeKey,
      );
      if (existingNudge) continue;
      this.put("nudges", nudge);
      this.appendChange(fact.projectId, "nudge", nudge.id, "queued", nudge.createdAt);
      nudges.push(nudge);
    }
    return { fact, nudges, duplicate: false };
  }

  sync(input: SyncRequest, now = new Date()): SyncResponse {
    const recipient = this.requireSession(input.projectId, input.sessionId);
    const sessions = this.list<AgentSession>("sessions", input.projectId);
    const facts = this.list<ContextFact>("facts", input.projectId);
    const nudges = this.list<Nudge>("nudges", input.projectId).filter(
      (item) => item.recipientSessionId === recipient.id,
    );
    const claims = this.activeClaims(input.projectId, now);
    const peers = sessions
      .filter(
        (session) =>
          session.id !== recipient.id && isSessionPresent(session, now),
      )
      .map(toPeerPresence);
    const changes = this.changeLog(input.projectId, input.cursor);
    const cursor = changes.at(-1)?.sequence ?? input.cursor;
    const status = liveSyncStatus({ recipient, facts, nudges, claims, now });
    const digest = buildLiveSyncDigest({
      projectId: input.projectId,
      recipientSessionId: recipient.id,
      cursor,
      peers,
      nudges,
      claims,
    });
    return {
      schemaVersion: 1,
      projectId: input.projectId,
      recipientSessionId: recipient.id,
      generatedAt: now.toISOString(),
      cursor,
      digest,
      status,
      peers,
      nudges,
      claims,
      changes,
    };
  }

  acquireClaim(input: ClaimRequest, now = new Date()) {
    this.requireSession(input.projectId, input.sessionId);
    const path = normalizeClaimPath(input.path);
    const pathKey = path.toLowerCase();
    const current = this.activeClaims(input.projectId, now).find(
      (claim) => claim.pathKey === pathKey,
    );
    if (current && current.sessionId !== input.sessionId)
      return { acquired: false as const, conflict: current };
    if (current && current.sessionId === input.sessionId) {
      const renewed: PathClaim = {
        ...current,
        leaseExpiresAt: new Date(
          now.getTime() + input.leaseSeconds * 1000,
        ).toISOString(),
      };
      this.put("claims", renewed);
      this.appendChange(input.projectId, "claim", renewed.id, "renewed", now.toISOString());
      return { acquired: true as const, claim: renewed, renewed: true };
    }
    const factId = `fact-${randomUUID()}`;
    const claim: PathClaim = {
      id: `claim-${randomUUID()}`,
      schemaVersion: 1,
      projectId: input.projectId,
      sessionId: input.sessionId,
      path,
      pathKey,
      state: "active",
      acquiredAt: now.toISOString(),
      leaseExpiresAt: new Date(
        now.getTime() + input.leaseSeconds * 1000,
      ).toISOString(),
      factId,
    };
    const fact: ContextFact = {
      id: factId,
      schemaVersion: 1,
      projectId: input.projectId,
      authorSessionId: input.sessionId,
      kind: "claim",
      title: `${input.sessionId} claimed ${path}`,
      summary: `An active agent is editing ${path}. Coordinate before changing the same path.`,
      paths: [path],
      tags: ["claim", "live-sync"],
      sourceRefs: [
        {
          type: "hook-event",
          label: "Agent Nudge path claim",
          sessionId: input.sessionId,
          filePath: path,
          sourceHash: createHash("sha256")
            .update(`${input.projectId}:${input.sessionId}:${pathKey}`)
            .digest("hex"),
        },
      ],
      confidence: 1,
      createdAt: now.toISOString(),
      effectiveAt: now.toISOString(),
      expiresAt: claim.leaseExpiresAt,
      contradictsFactIds: [],
      dependsOnFactIds: [],
      invalidatesFactIds: [],
      sensitivity: "normal",
      extensionMetadata: { claimId: claim.id },
    };
    this.put("claims", claim);
    this.appendChange(input.projectId, "claim", claim.id, "acquired", claim.acquiredAt);
    const routed = this.recordAndFanOutFact(fact, now);
    return { acquired: true as const, claim, renewed: false, routed };
  }

  releaseClaim(input: ReleaseClaimRequest, now = new Date()) {
    const claim = this.get<PathClaim>("claims", input.claimId);
    if (!claim || claim.projectId !== input.projectId)
      throw new Error("claim_not_found");
    if (claim.sessionId !== input.sessionId) throw new Error("claim_not_owned");
    if (claim.state === "released") return claim;
    const released: PathClaim = {
      ...claim,
      state: "released",
      releasedAt: now.toISOString(),
    };
    this.put("claims", released);
    this.appendChange(input.projectId, "claim", claim.id, "released", released.releasedAt);
    this.supersedeClaimNudges(input.projectId, claim.factId, now);
    const releaseFact: ContextFact = {
      id: `fact-${randomUUID()}`,
      schemaVersion: 1,
      projectId: input.projectId,
      authorSessionId: input.sessionId,
      kind: "release",
      title: `${claim.path} claim released`,
      summary: `${input.sessionId} released the active claim for ${claim.path}.`,
      paths: [claim.path],
      tags: ["claim", "release"],
      sourceRefs: [
        {
          type: "manual",
          label: "Agent Nudge claim release",
          sessionId: input.sessionId,
          filePath: claim.path,
          sourceHash: createHash("sha256")
            .update(`${claim.id}:${released.releasedAt}`)
            .digest("hex"),
        },
      ],
      confidence: 1,
      createdAt: released.releasedAt,
      effectiveAt: released.releasedAt,
      expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
      contradictsFactIds: [claim.factId],
      dependsOnFactIds: [],
      invalidatesFactIds: [claim.factId],
      sensitivity: "normal",
      extensionMetadata: { claimId: claim.id },
    };
    const routed = this.recordAndFanOutFact(releaseFact, now);
    return { ...released, routed };
  }

  releaseSessionClaims(
    projectId: string,
    sessionId: string,
    paths: string[] = [],
    now = new Date(),
  ) {
    const keys = new Set(paths.map((path) => normalizeClaimPath(path).toLowerCase()));
    const claims = this.activeClaims(projectId, now).filter(
      (claim) =>
        claim.sessionId === sessionId &&
        (keys.size === 0 || keys.has(claim.pathKey)),
    );
    return claims.map((claim) =>
      this.releaseClaim(
        { projectId, sessionId, claimId: claim.id },
        now,
      ),
    );
  }

  acknowledge(input: AcknowledgeRequest, now = new Date()) {
    this.requireSession(input.projectId, input.sessionId);
    const nudge = this.get<Nudge>("nudges", input.nudgeId);
    if (!nudge || nudge.projectId !== input.projectId)
      throw new Error("nudge_not_found");
    if (nudge.recipientSessionId !== input.sessionId)
      throw new Error("nudge_not_owned");
    if (nudge.state === "acknowledged") return nudge;
    const updated: Nudge = {
      ...nudge,
      state: "acknowledged",
      acknowledgedAt: now.toISOString(),
    };
    this.put("nudges", updated);
    this.put("feedback", {
      id: `feedback-${randomUUID()}`,
      projectId: input.projectId,
      nudgeId: input.nudgeId,
      sessionId: input.sessionId,
      action: "acknowledged",
      at: updated.acknowledgedAt,
    });
    this.appendChange(input.projectId, "nudge", updated.id, "acknowledged", updated.acknowledgedAt);
    return updated;
  }

  activeClaims(projectId: string, now = new Date()) {
    const claims = this.list<PathClaim>("claims", projectId);
    return claims.filter(
      (claim) =>
        claim.state === "active" &&
        Date.parse(claim.leaseExpiresAt) > now.getTime(),
    );
  }

  changeLog(projectId: string, cursor = 0): ChangeLogEntry[] {
    const rows = this.db
      .prepare(
        "SELECT sequence, project_id, entity_type, entity_id, action, at FROM change_log WHERE project_id = ? AND sequence > ? ORDER BY sequence ASC",
      )
      .all(projectId, cursor);
    return rows.map((row) => {
      const value = row as Record<string, unknown>;
      return {
        sequence: Number(value.sequence),
        projectId: String(value.project_id),
        entityType: value.entity_type as ChangeLogEntry["entityType"],
        entityId: String(value.entity_id),
        action: String(value.action),
        at: String(value.at),
      };
    });
  }

  contextPack(projectId: string, recipientSessionId?: string) {
    const sessions = this.list<AgentSession>("sessions", projectId);
    const facts = this.list<ContextFact>("facts", projectId);
    const nudges = this.list<Nudge>("nudges", projectId);
    return buildContextPack({
      projectId,
      recipientSessionId,
      sessions,
      facts,
      nudges,
    });
  }

  portfolioSummary(now = new Date()) {
    return buildPortfolioSummary(
      this.list<AgentSession>("sessions"),
      this.list<ContextFact>("facts"),
      this.list<Nudge>("nudges"),
      this.list<PathClaim>("claims"),
      now,
    );
  }

  snapshot(projectId?: string) {
    const sessions = this.list<AgentSession>("sessions", projectId);
    const events = this.list<AgentEvent>("events", projectId);
    const facts = this.list<ContextFact>("facts", projectId);
    const nudges = this.list<Nudge>("nudges", projectId);
    return {
      sessions,
      events,
      facts,
      nudges,
      metrics: {
        activeAgents: sessions.filter((item) => item.status === "active").length,
        openNudges: nudges.filter((item) => item.state === "queued").length,
        acknowledged: nudges.filter((item) => item.state === "acknowledged").length,
        conflictsPrevented: nudges.filter(
          (item) => item.deliveryClass === "BLOCK" && item.state !== "queued",
        ).length,
      },
    };
  }

  exportAll() {
    return {
      sessions: this.list("sessions"),
      tasks: this.list("tasks"),
      events: this.list("events"),
      evidence: this.list("evidence"),
      facts: this.list("facts"),
      nudges: this.list("nudges"),
      claims: this.list("claims"),
      feedback: this.list("feedback"),
      manifests: this.list("manifests"),
    };
  }

  purgePreview() {
    const counts = this.db
      .prepare("SELECT kind, COUNT(*) AS count FROM records GROUP BY kind")
      .all() as Array<{ kind: string; count: number }>;
    return {
      dryRun: true,
      counts: Object.fromEntries(
        counts.map((row) => [row.kind, Number(row.count)]),
      ),
    };
  }

  seedScenario(result: {
    sessions: AgentSession[];
    events: AgentEvent[];
    facts: ContextFact[];
    nudges: Nudge[];
  }) {
    result.sessions.forEach((session) => this.put("sessions", session));
    result.events.forEach((event) => this.putEvent(event));
    result.facts.forEach((fact) => this.put("facts", fact));
    result.nudges.forEach((nudge) => this.put("nudges", nudge));
  }

  close() {
    this.db.close();
  }

  private supersedeClaimNudges(
    projectId: string,
    factId: string,
    now: Date,
  ) {
    for (const nudge of this.list<Nudge>("nudges", projectId)) {
      if (
        nudge.factId === factId &&
        !["expired", "superseded", "dismissed"].includes(nudge.state)
      )
        this.put("nudges", {
          ...nudge,
          state: "superseded",
          extensionMetadata: {
            ...nudge.extensionMetadata,
            supersededAt: now.toISOString(),
          },
        });
    }
  }

  private requireSession(projectId: string, sessionId: string) {
    const session = this.get<AgentSession>("sessions", sessionId);
    if (!session || session.projectId !== projectId)
      throw new Error("session_not_found");
    return session;
  }
}
