import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../../src/daemon/server.js";
import {
  createHealthChallenge,
  LocalControlAuth,
} from "../../src/security/local-control.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const cleanup: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  for (const dispose of cleanup.splice(0).reverse()) await dispose();
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "agent-nudge-control-"));
  const auth = LocalControlAuth.loadOrCreate(directory);
  const database = new NudgeDatabase(":memory:");
  const app = createServer(database, { auth });
  cleanup.push(async () => {
    await app.close();
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { app, auth, database, directory };
}

function headers(auth: LocalControlAuth, extra: Record<string, string> = {}) {
  return { authorization: auth.authorizationHeader(), ...extra };
}

describe("local control-plane authentication", () => {
  it("rejects unauthenticated and impersonated mutations without changing state", async () => {
    const { app, auth, database } = fixture();
    const unauthenticated = await app.inject({
      method: "POST",
      url: "/demo/conflict",
    });
    const impersonated = await app.inject({
      method: "POST",
      url: "/demo/conflict",
      headers: { authorization: `${auth.authorizationHeader()}-wrong` },
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(impersonated.statusCode).toBe(401);
    expect(database.snapshot().nudges).toHaveLength(0);
  });

  it("rejects hostile hosts and the former null-origin browser exception", async () => {
    const { app, auth } = fixture();
    const hostileHost = await app.inject({
      method: "GET",
      url: "/snapshot",
      headers: headers(auth, { host: "attacker.example" }),
    });
    const nullOrigin = await app.inject({
      method: "GET",
      url: "/snapshot",
      headers: headers(auth, { origin: "null" }),
    });
    const allowedOrigin = await app.inject({
      method: "GET",
      url: "/snapshot",
      headers: headers(auth, { origin: "http://127.0.0.1:4173" }),
    });

    expect(hostileHost.statusCode).toBe(403);
    expect(nullOrigin.statusCode).toBe(403);
    expect(allowedOrigin.statusCode).toBe(200);
  });

  it("proves daemon identity without exposing the control token", async () => {
    const { app, auth } = fixture();
    const challenge = createHealthChallenge();
    const response = await app.inject({
      method: "GET",
      url: "/v1/health",
      headers: headers(auth, { "x-agent-nudge-challenge": challenge }),
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "agent-nudge",
      version: "0.5.1",
      protocolVersion: 1,
      instanceId: auth.instanceId,
    });
    expect(auth.verify(challenge, body.challengeProof)).toBe(true);
    expect(response.body).not.toContain(auth.authorizationHeader().slice(7));
    const exported = await app.inject({
      method: "GET",
      url: "/export",
      headers: headers(auth),
    });
    expect(exported.body).not.toContain(auth.authorizationHeader().slice(7));
    expect(
      await app.inject({
        method: "GET",
        url: "/health",
        headers: headers(auth),
      }),
    ).toMatchObject({ statusCode: 404 });
  });

  it("rotates the token atomically and invalidates the previous credential", async () => {
    const { app, auth, directory } = fixture();
    const previous = auth.authorizationHeader();
    const rotated = await app.inject({
      method: "POST",
      url: "/v1/auth/rotate",
      headers: { authorization: previous },
    });
    const reloaded = LocalControlAuth.loadOrCreate(directory);
    const rejected = await app.inject({
      method: "GET",
      url: "/snapshot",
      headers: { authorization: previous },
    });
    const accepted = await app.inject({
      method: "GET",
      url: "/snapshot",
      headers: { authorization: reloaded.authorizationHeader() },
    });

    expect(rotated.statusCode).toBe(200);
    expect(rotated.body).not.toContain(previous.slice(7));
    expect(reloaded.authorizationHeader()).not.toBe(previous);
    expect(rejected.statusCode).toBe(401);
    expect(accepted.statusCode).toBe(200);
  });

  it("stores credentials outside repositories with owner-only permissions", () => {
    const { auth } = fixture();
    const tokenPath = auth.paths?.token;
    expect(tokenPath).toBeDefined();
    expect(relative(resolve(process.cwd()), resolve(tokenPath!))).toMatch(
      /^\.\.[\\/]/,
    );
    if (process.platform === "win32") {
      const acl = execFileSync("icacls", [tokenPath!], {
        encoding: "utf8",
        windowsHide: true,
      });
      expect(acl).not.toContain("(I)");
    } else {
      expect(statSync(tokenPath!).mode & 0o777).toBe(0o600);
    }
  });
});
