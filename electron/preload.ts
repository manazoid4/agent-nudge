import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agentNudge", {
  endpoint: `http://127.0.0.1:${Number(process.env.AGENT_NUDGE_PORT ?? 47831)}`,
  platform: process.platform,
  version: process.env.npm_package_version ?? "0.5.1",
  request: (path: string, init: { method?: string; body?: string } = {}) =>
    ipcRenderer.invoke("agent-nudge:request", {
      path,
      method: init.method,
      body: init.body,
    }),
});
