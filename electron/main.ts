import {
  app,
  BrowserWindow,
  nativeImage,
  Tray,
  Menu,
  shell,
  ipcMain,
} from "electron";
import { join } from "node:path";
import { createServer } from "../src/daemon/server.js";
import { resolveDatabasePath } from "../src/core/paths.js";
import { NudgeDatabase } from "../src/storage/database.js";
import {
  createHealthChallenge,
  LocalControlAuth,
} from "../src/security/local-control.js";

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let database: NudgeDatabase | null = null;
let server: ReturnType<typeof createServer> | null = null;
let auth: LocalControlAuth | null = null;
let isQuitting = false;
const portArgument = process.argv
  .find((argument) => argument.startsWith("--agent-nudge-port="))
  ?.split("=", 2)[1];
const daemonPort = Number(
  portArgument ?? process.env.AGENT_NUDGE_PORT ?? 47831,
);
if (!Number.isInteger(daemonPort) || daemonPort < 1024 || daemonPort > 65_535)
  throw new Error("invalid_agent_nudge_port");
const daemonEndpoint = `http://127.0.0.1:${daemonPort}`;

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }
});

app.whenReady().then(async () => {
  database = new NudgeDatabase(resolveDatabasePath());
  auth = LocalControlAuth.loadOrCreate();
  server = createServer(database, { auth });
  try {
    await server.listen({ host: "127.0.0.1", port: daemonPort });
  } catch (error) {
    if (!String(error).includes("EADDRINUSE")) throw error;
    const challenge = createHealthChallenge();
    const response = await daemonRequest("/v1/health", {
      headers: { "x-agent-nudge-challenge": challenge },
      signal: AbortSignal.timeout(750),
    });
    const health = (await response.json()) as {
      ok?: boolean;
      service?: string;
      version?: string;
      localOnly?: boolean;
      challengeProof?: string;
    };
    if (
      !response.ok ||
      !health.ok ||
      health.service !== "agent-nudge" ||
      health.version !== "0.5.1" ||
      health.localOnly !== true ||
      typeof health.challengeProof !== "string" ||
      !auth.verify(challenge, health.challengeProof)
    )
      throw new Error(`port_${daemonPort}_is_not_compatible_agent_nudge`);
  }
  ipcMain.handle("agent-nudge:request", async (_event, request) => {
    const input = request as { path?: string; method?: string; body?: string };
    if (!input.path?.startsWith("/") || input.path.startsWith("//"))
      throw new Error("invalid_local_control_path");
    const method = input.method ?? "GET";
    if (!["GET", "POST"].includes(method))
      throw new Error("invalid_local_control_method");
    const response = await daemonRequest(input.path, {
      method,
      headers: input.body ? { "content-type": "application/json" } : undefined,
      body: input.body,
      signal: AbortSignal.timeout(5_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get("content-type") ?? "application/json",
    };
  });
  createWindow();
  createTray();
});

async function daemonRequest(path: string, init: RequestInit = {}) {
  if (!auth) throw new Error("local_control_auth_not_ready");
  const target = new URL(path, `${daemonEndpoint}/`);
  if (target.origin !== daemonEndpoint)
    throw new Error("invalid_local_control_path");
  const headers = new Headers(init.headers);
  headers.set("authorization", auth.authorizationHeader());
  return fetch(target, { ...init, headers });
}
function createWindow() {
  window = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: "#0e0e0e",
    show: false,
    title: "Agent Nudge",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void window.loadFile(join(__dirname, "..", "dist-web", "index.html"), {
    query: { desktop: "1", endpoint: daemonEndpoint },
  });
  window.once("ready-to-show", () => window?.show());
  window.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window?.hide();
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
}

function createTray() {
  const png = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAK0lEQVR42mNgGAWjYBSMglEwCkbB////GZgYGBiYGP4zMDD8Z2Bg+A8VAwA5fQQfrySR6QAAAABJRU5ErkJggg==",
  );
  tray = new Tray(png);
  tray.setToolTip("Agent Nudge · local context assurance");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Agent Nudge",
        click: () => {
          window?.show();
          window?.focus();
        },
      },
      {
        label: "Run proof demo",
        click: () => void daemonRequest("/demo", { method: "POST" }),
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("double-click", () => window?.show());
}

app.on("before-quit", () => {
  isQuitting = true;
});
app.on("window-all-closed", () => {
  if (process.platform !== "win32") app.quit();
});
app.on("quit", () => {
  void server?.close();
  database?.close();
});
