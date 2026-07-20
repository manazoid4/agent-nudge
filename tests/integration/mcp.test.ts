import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../../src/mcp/tools.js";
import { NudgeDatabase } from "../../src/storage/database.js";

describe("MCP server", () => {
  it("round-trips status, fact creation, and inbox retrieval", async () => {
    const database = new NudgeDatabase(":memory:");
    const server = createMcpServer(database);
    const client = new Client({ name: "agent-nudge-test", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "agent_nudge_status",
        "agent_nudge_record_demo",
        "agent_nudge_inbox",
        "agent_nudge_context_pack",
        "agent_nudge_portfolio",
      ]),
    );

    const recorded = await client.callTool({
      name: "agent_nudge_record_demo",
      arguments: { scenario: "conflict" },
    });
    const recordedText = (recorded.content as Array<{ text?: string }>)[0]
      ?.text;
    expect(recordedText && JSON.parse(recordedText)).toMatchObject({
      deliveryClass: "BLOCK",
      suppressed: false,
    });

    const inbox = await client.callTool({
      name: "agent_nudge_inbox",
      arguments: { projectId: "project-agent-nudge" },
    });
    const inboxText = (inbox.content as Array<{ text?: string }>)[0]?.text;
    expect(inboxText && JSON.parse(inboxText)[0]).toMatchObject({
      title: "Claude is editing cache.ts",
      deliveryClass: "BLOCK",
    });

    const pack = await client.callTool({
      name: "agent_nudge_context_pack",
      arguments: {
        projectId: "project-agent-nudge",
        recipientSessionId: "codex-conflict",
      },
    });
    const packText = (pack.content as Array<{ text?: string }>)[0]?.text;
    expect(packText && JSON.parse(packText)).toMatchObject({
      status: "HOLD",
      counts: { blockers: 1 },
    });

    const portfolio = await client.callTool({
      name: "agent_nudge_portfolio",
      arguments: {},
    });
    const portfolioText = (portfolio.content as Array<{ text?: string }>)[0]
      ?.text;
    expect(portfolioText && JSON.parse(portfolioText).metrics).toMatchObject({
      projects: 1,
      openHolds: 1,
    });

    await client.close();
    await server.close();
    database.close();
  });
});
