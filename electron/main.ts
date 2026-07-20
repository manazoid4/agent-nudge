import { app, BrowserWindow, nativeImage, Tray, Menu, shell } from "electron";
import { join } from "node:path";
import { createServer } from "../src/daemon/server.js";
import { NudgeDatabase } from "../src/storage/database.js";

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let database: NudgeDatabase | null = null;
let server: ReturnType<typeof createServer> | null = null;
let isQuitting = false;

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
  database = new NudgeDatabase(join(app.getPath("userData"), "agent-nudge.db"));
  server = createServer(database);
  try {
    await server.listen({ host: "127.0.0.1", port: 47831 });
  } catch (error) {
    if (!String(error).includes("EADDRINUSE")) throw error;
  }
  createWindow();
  createTray();
});

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
    query: { desktop: "1" },
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
        click: () =>
          void fetch("http://127.0.0.1:47831/demo", { method: "POST" }),
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
