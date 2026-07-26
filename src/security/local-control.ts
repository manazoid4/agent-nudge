import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { resolveAgentNudgeHome } from "../core/paths.js";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const securedTokenPaths = new Set<string>();

export type LocalControlPaths = {
  directory: string;
  token: string;
  instance: string;
};

export class LocalControlAuth {
  readonly paths?: LocalControlPaths;
  readonly instanceId: string;
  private tokenValue: string;

  private constructor(
    token: string,
    instanceId: string,
    paths?: LocalControlPaths,
  ) {
    assertToken(token);
    this.tokenValue = token;
    this.instanceId = instanceId;
    this.paths = paths;
  }

  static loadOrCreate(directory = resolveAgentNudgeHome()) {
    const paths = resolveLocalControlPaths(directory);
    mkdirSync(paths.directory, { recursive: true, mode: 0o700 });
    secureOwnerOnly(paths.directory, true);
    const token = readOrCreateSecret(paths.token);
    const instanceId = readOrCreateInstanceId(paths.instance);
    return new LocalControlAuth(token, instanceId, paths);
  }

  static ephemeral() {
    return new LocalControlAuth(
      randomBytes(TOKEN_BYTES).toString("base64url"),
      randomUUID(),
    );
  }

  authorizationHeader() {
    return `Bearer ${this.tokenValue}`;
  }

  authorize(header: string | string[] | undefined) {
    if (typeof header !== "string" || !header.startsWith("Bearer "))
      return false;
    const candidate = header.slice("Bearer ".length);
    if (candidate.length !== this.tokenValue.length) return false;
    return timingSafeEqual(
      Buffer.from(candidate, "utf8"),
      Buffer.from(this.tokenValue, "utf8"),
    );
  }

  prove(challenge: string) {
    if (!CHALLENGE_PATTERN.test(challenge))
      throw new Error("invalid_health_challenge");
    return createHmac("sha256", this.tokenValue)
      .update(`${this.instanceId}:${challenge}`)
      .digest("base64url");
  }

  verify(challenge: string, proof: string) {
    if (!CHALLENGE_PATTERN.test(challenge)) return false;
    const expected = this.prove(challenge);
    if (proof.length !== expected.length) return false;
    return timingSafeEqual(
      Buffer.from(proof, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  }

  rotate() {
    const next = randomBytes(TOKEN_BYTES).toString("base64url");
    if (this.paths) writeAtomicSecret(this.paths.token, next);
    this.tokenValue = next;
  }
}

export function resolveLocalControlPaths(
  directory = resolveAgentNudgeHome(),
): LocalControlPaths {
  const root = resolve(directory);
  return {
    directory: root,
    token: join(root, "control-plane.key"),
    instance: join(root, "daemon-instance"),
  };
}

export function readLocalControlAuthorization(
  directory = resolveAgentNudgeHome(),
) {
  const path = resolveLocalControlPaths(directory).token;
  if (!existsSync(path))
    return LocalControlAuth.loadOrCreate(directory).authorizationHeader();
  if (!securedTokenPaths.has(path)) {
    secureOwnerOnly(path, false);
    securedTokenPaths.add(path);
  }
  const token = readFileSync(path, "utf8").trim();
  assertToken(token);
  return `Bearer ${token}`;
}

export async function localControlFetch(
  endpoint: string,
  path: string,
  init: RequestInit = {},
  directory = resolveAgentNudgeHome(),
) {
  const base = new URL(endpoint);
  if (
    base.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)
  )
    throw new Error("local_control_endpoint_must_be_loopback");
  const target = new URL(path, `${base.origin}/`);
  if (target.origin !== base.origin)
    throw new Error("local_control_request_must_stay_on_endpoint");
  const headers = new Headers(init.headers);
  headers.set("authorization", readLocalControlAuthorization(directory));
  return fetch(target, { ...init, headers });
}

export function createHealthChallenge() {
  return randomBytes(24).toString("base64url");
}

function readOrCreateSecret(path: string) {
  if (existsSync(path)) {
    secureOwnerOnly(path, false);
    const token = readFileSync(path, "utf8").trim();
    assertToken(token);
    return token;
  }
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  try {
    writeFileSync(path, `${token}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (!existsSync(path)) throw error;
    return readOrCreateSecret(path);
  }
  secureOwnerOnly(path, false);
  return token;
}

function readOrCreateInstanceId(path: string) {
  if (existsSync(path)) {
    secureOwnerOnly(path, false);
    const value = readFileSync(path, "utf8").trim();
    if (!/^[0-9a-f-]{36}$/i.test(value))
      throw new Error("invalid_daemon_instance_identity");
    return value;
  }
  const value = randomUUID();
  writeFileSync(path, `${value}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  secureOwnerOnly(path, false);
  return value;
}

function writeAtomicSecret(path: string, token: string) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${token}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  secureOwnerOnly(temporary, false);
  renameSync(temporary, path);
  secureOwnerOnly(path, false);
}

function assertToken(token: string) {
  if (!TOKEN_PATTERN.test(token))
    throw new Error("invalid_local_control_secret");
}

function secureOwnerOnly(path: string, directory: boolean) {
  chmodSync(path, directory ? 0o700 : 0o600);
  if (process.platform !== "win32") return;
  const owner = execFileSync("whoami", {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  execFileSync(
    "icacls",
    [
      path,
      "/inheritance:r",
      "/grant:r",
      `${owner}:${directory ? "(OI)(CI)(F)" : "(R,W)"}`,
    ],
    { windowsHide: true, stdio: "ignore" },
  );
}
