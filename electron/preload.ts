import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("agentNudge", {
  endpoint: `http://127.0.0.1:${Number(process.env.AGENT_NUDGE_PORT ?? 47831)}`,
  platform: process.platform,
  version: process.env.npm_package_version ?? "0.5.0",
});
