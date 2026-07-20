import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    main: "electron/main.ts",
    preload: "electron/preload.ts",
    daemon: "src/daemon/run.ts",
    cli: "src/cli/index.ts",
    hook: "src/adapters/hook-runner.ts",
    mcp: "src/mcp/server.ts",
  },
  outDir: "dist-node",
  format: ["cjs"],
  platform: "node",
  target: "node20",
  removeNodeProtocol: false,
  sourcemap: true,
  clean: true,
  noExternal: ["fastify", "zod", "@modelcontextprotocol/sdk"],
  external: ["electron", "node:sqlite"],
});
