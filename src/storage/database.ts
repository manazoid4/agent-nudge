import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AgentEvent,
  AgentSession,
  ContextFact,
  Nudge,
} from "../core/schemas.js";

type StoredKind =
  "sessions" | "events" | "facts" | "nudges" | "feedback" | "manifests";

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
      PRAGMA user_version = 1;
    `);
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

  snapshot(projectId?: string) {
    const sessions = this.list<AgentSession>("sessions", projectId);
    const facts = this.list<ContextFact>("facts", projectId);
    const nudges = this.list<Nudge>("nudges", projectId);
    const events = this.list<AgentEvent>("events", projectId);
    return {
      sessions,
      facts,
      nudges,
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
        "events",
        "facts",
        "nudges",
        "feedback",
        "manifests",
      ] as StoredKind[]
    ).map((kind) => ({ kind, count: this.list(kind).length }));
  }

  close() {
    this.db.close();
  }
}
