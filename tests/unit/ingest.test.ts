import { describe, expect, it, vi } from "vitest";

import {
  createOpenAICompatibleIngestModel,
  ingestVoiceNote,
  IngestError,
} from "../../src/core/ingest.js";

describe("voice-note ingestion", () => {
  it("exposes an ingestion service", async () => {
    const module = await import("../../src/core/ingest.js").catch(
      () => undefined,
    );

    expect(module?.ingestVoiceNote).toBeTypeOf("function");
  });

  it("normalizes model output through a provider-neutral boundary", async () => {
    const complete = vi.fn().mockResolvedValue(`\`\`\`json
{"cleanedText":"Codex: research the posts filter first.","tasks":[{"id":"research-posts-filter","title":"Research posts filter","objective":"Resolve the posts-filter requirements.","suggestedMode":"RESEARCH","dependencies":[]}]}
\`\`\``);

    const raw = "  kodaks research the pulse filter first  ";
    await expect(ingestVoiceNote(raw, { complete })).resolves.toEqual({
      originalText: raw,
      cleanedText: "Codex: research the posts filter first.",
      tasks: [
        {
          id: "research-posts-filter",
          title: "Research posts filter",
          objective: "Resolve the posts-filter requirements.",
          suggestedMode: "RESEARCH",
          dependencies: [],
        },
      ],
    });
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0,
        userPrompt: "Codex research the posts filter first",
        systemPrompt: expect.stringContaining("untrusted"),
      }),
    );

    await expect(ingestVoiceNote("   ", { complete })).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(complete).toHaveBeenCalledTimes(1);
    await expect(
      ingestVoiceNote("split this", {
        complete: async () => "not json",
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "invalid_json" }));
    await expect(
      ingestVoiceNote("split this", {
        complete: async () =>
          '[{"title":"Task","objective":"Do it","suggestedMode":"BUILD","extra":true}]',
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "invalid_task_schema" }));

    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "[]" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const model = createOpenAICompatibleIngestModel({
      baseUrl: "http://127.0.0.1:11434/v1/",
      model: "local-fast",
      apiKey: "secret",
      fetch,
    });
    await expect(
      model.complete({
        systemPrompt: "system",
        userPrompt: "note",
        temperature: 0,
      }),
    ).resolves.toBe("[]");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer secret" }),
      }),
    );
    const requestBody = JSON.parse(
      String((fetch.mock.calls[0]![1] as RequestInit).body),
    );
    expect(requestBody).toMatchObject({
      reasoning_effort: "none",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingest_task_dag",
          strict: true,
          schema: {
            type: "object",
            required: ["cleanedText", "tasks"],
            properties: {
              tasks: {
                items: {
                  required: [
                    "id",
                    "title",
                    "objective",
                    "suggestedMode",
                    "dependencies",
                  ],
                },
              },
            },
          },
        },
      },
    });
    expect(IngestError).toBeTypeOf("function");
  });

  it("reports safe, stable errors for fallible model boundaries", async () => {
    await expect(
      ingestVoiceNote("split this", {
        complete: async () => {
          throw new Error("secret provider detail");
        },
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "model_failed" }));
    await expect(
      ingestVoiceNote("split this", {
        complete: async () => "x".repeat(256 * 1024 + 1),
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "model_output_too_large" }),
    );

    const httpFailure = createOpenAICompatibleIngestModel({
      baseUrl: "http://localhost:11434/v1",
      model: "local-fast",
      fetch: vi
        .fn()
        .mockResolvedValue(new Response("private", { status: 503 })),
    });
    await expect(
      httpFailure.complete({
        systemPrompt: "system",
        userPrompt: "note",
        temperature: 0,
      }),
    ).rejects.toEqual(expect.objectContaining({ code: "model_http_error" }));

    const malformed = createOpenAICompatibleIngestModel({
      baseUrl: "http://localhost:11434/v1",
      model: "local-fast",
      fetch: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ choices: [] }), { status: 200 }),
        ),
    });
    await expect(
      malformed.complete({
        systemPrompt: "system",
        userPrompt: "note",
        temperature: 0,
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "invalid_model_response" }),
    );
  });

  it("returns an authoritative raw note with a validated task DAG", async () => {
    const raw = "  kodaks research the pulse filter then build it  ";
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({
        cleanedText: "Codex: research the posts filter, then build it.",
        tasks: [
          {
            id: "research-posts-filter",
            title: "Research posts filter",
            objective: "Resolve the unknown posts-filter behavior.",
            suggestedMode: "RESEARCH",
            dependencies: [],
          },
          {
            id: "build-posts-filter",
            title: "Build posts filter slice",
            objective:
              "Deliver a working posts filter through the UI boundary.",
            suggestedMode: "BUILD",
            dependencies: ["research-posts-filter"],
          },
        ],
      }),
    );

    await expect(ingestVoiceNote(raw, { complete })).resolves.toEqual({
      originalText: raw,
      cleanedText: "Codex: research the posts filter, then build it.",
      tasks: expect.arrayContaining([
        expect.objectContaining({
          id: "build-posts-filter",
          dependencies: ["research-posts-filter"],
        }),
      ]),
    });
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: "Codex research the posts filter then build it",
        systemPrompt: expect.stringMatching(
          /phonetic|vertical slice|dependencies/i,
        ),
      }),
    );
  });

  it("surfaces safe DAG validation reasons without echoing model output", async () => {
    const invalidOutput = JSON.stringify({
      cleanedText: "Build both tasks.",
      tasks: [
        {
          id: "first",
          title: "First",
          objective: "Deliver first.",
          suggestedMode: "BUILD",
          dependencies: ["second"],
        },
        {
          id: "second",
          title: "Second",
          objective: "Deliver second.",
          suggestedMode: "BUILD",
          dependencies: ["first"],
        },
      ],
      secret: "do-not-log-this",
    });

    await expect(
      ingestVoiceNote("build both tasks", {
        complete: async () => invalidOutput,
      }),
    ).rejects.toMatchObject({
      code: "invalid_task_schema",
      details: expect.arrayContaining(["dependency_cycle"]),
      message: expect.not.stringContaining("do-not-log-this"),
    });
  });
});
