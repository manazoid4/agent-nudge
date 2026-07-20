import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AgentEvent } from "../core/schemas.js";
import { resolveProjectStateDir } from "../core/paths.js";

export type OutboxDelivery = {
  delivered: boolean;
  queued: boolean;
  status: number;
  flushed: number;
  pending: number;
};

export type EventOutboxOptions = {
  endpoint?: string;
  stateDir?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export class EventOutbox {
  readonly directory: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(
    readonly projectId: string,
    options: EventOutboxOptions = {},
  ) {
    this.directory = join(
      resolveProjectStateDir(projectId, options.stateDir),
      "outbox",
    );
    this.endpoint = options.endpoint ?? "http://127.0.0.1:47831/events";
    this.timeoutMs = options.timeoutMs ?? 350;
    this.fetcher = options.fetcher ?? fetch;
  }

  depth() {
    if (!existsSync(this.directory)) return 0;
    return readdirSync(this.directory).filter((name) => name.endsWith(".json"))
      .length;
  }

  async deliver(event: AgentEvent): Promise<OutboxDelivery> {
    const flushed = await this.flush();
    const status = await this.send(event);
    if (status >= 200 && status < 300) {
      return {
        delivered: true,
        queued: false,
        status,
        flushed,
        pending: this.depth(),
      };
    }
    this.enqueue(event);
    return {
      delivered: false,
      queued: true,
      status,
      flushed,
      pending: this.depth(),
    };
  }

  async flush() {
    if (!existsSync(this.directory)) return 0;
    let flushed = 0;
    for (const name of readdirSync(this.directory)
      .filter((entry) => entry.endsWith(".json"))
      .sort()) {
      const file = join(this.directory, name);
      let event: AgentEvent;
      try {
        event = JSON.parse(readFileSync(file, "utf8")) as AgentEvent;
      } catch {
        continue;
      }
      const status = await this.send(event);
      if (status < 200 || status >= 300) break;
      unlinkSync(file);
      flushed += 1;
    }
    return flushed;
  }

  private enqueue(event: AgentEvent) {
    mkdirSync(this.directory, { recursive: true });
    const target = join(this.directory, `${event.id}.json`);
    if (existsSync(target)) return;
    const temporary = `${target}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(event)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    try {
      renameSync(temporary, target);
    } catch (error) {
      if (existsSync(temporary)) unlinkSync(temporary);
      if (!existsSync(target)) throw error;
    }
  }

  private async send(event: AgentEvent) {
    try {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return response.status;
    } catch {
      return 0;
    }
  }
}
