import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../../src/daemon/server.js";
import { NudgeDatabase } from "../../src/storage/database.js";

const close: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const fn of close.splice(0)) await fn();
});

describe("localhost API", () => {
  it("runs all proof scenarios through the real API and storage", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });
    const response = await app.inject({ method: "POST", url: "/demo" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(
      body.results.map((item: any) => item.nudge?.deliveryClass ?? "DROP"),
    ).toEqual(["BLOCK", "ACT_NOW", "ACT_NOW", "DROP"]);
    expect(body.snapshot.nudges).toHaveLength(3);
  });

  it("updates acknowledgement separately from delivery", async () => {
    const db = new NudgeDatabase(":memory:");
    const app = createServer(db);
    close.push(async () => {
      await app.close();
      db.close();
    });
    const demo = (
      await app.inject({ method: "POST", url: "/demo/conflict" })
    ).json();
    const response = await app.inject({
      method: "POST",
      url: `/nudges/${demo.nudge.id}/action`,
      payload: { action: "acknowledge" },
    });
    expect(response.json()).toMatchObject({ state: "acknowledged" });
  });
});
