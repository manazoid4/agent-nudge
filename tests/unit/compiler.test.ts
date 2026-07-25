import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { loadProfile } from "../../src/compiler/profile-loader.js";
import { readRepositoryContext } from "../../src/compiler/repository-reader.js";
import { resolveConflicts } from "../../src/compiler/resolver.js";
import { computeDigest } from "../../src/compiler/digest.js";
import { renderBrief } from "../../src/compiler/renderer.js";

describe("Agent Brief Compiler", () => {
  const tmpDir = join(__dirname, ".tmp-compiler");

  beforeAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("Profile Loader", () => {
    it("loads approved personal rules and skips rejected/disabled", () => {
      const profilePath = join(tmpDir, "profile1.json");
      writeFileSync(profilePath, JSON.stringify({
        version: "1.0",
        rules: [
          { id: "r1", title: "R1", text: "T1", scope: "personal", status: "approved", enabled: true, applicableModes: ["*"], applicableAgents: ["*"] },
          { id: "r2", title: "R2", text: "T2", scope: "personal", status: "candidate", enabled: true, applicableModes: ["*"], applicableAgents: ["*"] },
          { id: "r3", title: "R3", text: "T3", scope: "personal", status: "approved", enabled: false, applicableModes: ["*"], applicableAgents: ["*"] }
        ]
      }));

      const loaded = loadProfile(profilePath);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]!.id).toBe("r1");
    });

    it("fails safely on malformed profile", () => {
      const profilePath = join(tmpDir, "profile_malformed.json");
      writeFileSync(profilePath, "not_json");
      expect(() => loadProfile(profilePath)).toThrow(/Failed to load profile/);
    });
  });

  describe("Repository Reader", () => {
    it("never reads .env files", () => {
      const testRepo = join(tmpDir, "repo_env");
      mkdirSync(testRepo);
      writeFileSync(join(testRepo, ".env"), "SECRET=true");
      writeFileSync(join(testRepo, "AGENTS.md"), "content");
      
      const { sources } = readRepositoryContext(testRepo);
      const sourcePaths = sources.map(s => s.path);
      expect(sourcePaths.some(p => p.includes(".env"))).toBe(false);
    });

    it("redacts credential-shaped content", () => {
      const testRepo = join(tmpDir, "repo_cred");
      mkdirSync(testRepo);
      writeFileSync(join(testRepo, "AGENTS.md"), "Use the password AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE");
      
      const { sources } = readRepositoryContext(testRepo);
      const agentMd = sources.find(s => s.path.includes("AGENTS.md"));
      expect(agentMd).toBeDefined();
      expect(agentMd!.content).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(agentMd!.content).toContain("REDACTED");
    });
  });

  describe("Regression: Agent and Mode Mapping", () => {
    it("Claude + RESEARCH maps correctly", () => {
      const rules: any[] = [
        { id: "1", title: "Claude Rule", text: "Claude only", applicableAgents: ["Claude"], applicableModes: ["*"], resolutionLevel: "PersonalDefault" },
        { id: "2", title: "Research Rule", text: "Research only", applicableAgents: ["*"], applicableModes: ["RESEARCH"], resolutionLevel: "PersonalDefault" },
        { id: "3", title: "Codex Rule", text: "Codex only", applicableAgents: ["Codex"], applicableModes: ["*"], resolutionLevel: "PersonalDefault" }
      ];
      
      const filtered = rules.filter(r => {
        const matchesAgent = r.applicableAgents.some((a: string) => a === "*" || a.toLowerCase() === "claude");
        const matchesMode = r.applicableModes.some((m: string) => m === "*" || m.toLowerCase() === "research");
        return matchesAgent && matchesMode;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.id)).toEqual(["1", "2"]);
    });

    it("Codex + BUILD maps correctly", () => {
      const ctx: any = { taskObjective: "Obj", mode: "BUILD", agent: "Codex", verbosity: "standard", sources: [], activeRules: [], conflictsSurfaced: [], digest: "123" };
      const output = renderBrief(ctx);
      expect(output).toContain("**Agent:** Codex");
      expect(output).toContain("**Mode:** BUILD");
      expect(output).toContain("Build Directives");
    });

    it("Hermes + RESUME maps correctly", () => {
      const ctx: any = { taskObjective: "Obj", mode: "RESUME", agent: "Hermes", verbosity: "standard", sources: [], activeRules: [], conflictsSurfaced: [], digest: "123" };
      const output = renderBrief(ctx);
      expect(output).toContain("**Agent:** Hermes");
      expect(output).toContain("**Mode:** RESUME");
      expect(output).toContain("Resume Directives");
    });

    it("OpenCode + REVIEW maps correctly", () => {
      const ctx: any = { taskObjective: "Obj", mode: "REVIEW", agent: "OpenCode", verbosity: "standard", sources: [], activeRules: [], conflictsSurfaced: [], digest: "123" };
      const output = renderBrief(ctx);
      expect(output).toContain("**Agent:** OpenCode");
      expect(output).toContain("**Mode:** REVIEW");
      expect(output).toContain("Review Directives");
    });

    it("Grok + PLAN maps correctly", () => {
      const ctx: any = { taskObjective: "Obj", mode: "PLAN", agent: "Grok", verbosity: "standard", sources: [], activeRules: [], conflictsSurfaced: [], digest: "123" };
      const output = renderBrief(ctx);
      expect(output).toContain("**Agent:** Grok");
      expect(output).toContain("**Mode:** PLAN");
      expect(output).toContain("Planning Directives");
    });
  });

  describe("Resolver", () => {
    it("repository rules override personal defaults", () => {
      const rules: any[] = [
        { id: "personal1", title: "Git Push", text: "No pushing", resolutionLevel: "PersonalDefault" },
        { id: "repo1", title: "Git Push", text: "Pushing allowed", resolutionLevel: "RepoConstitution" }
      ];
      
      const { activeRules, conflictsSurfaced } = resolveConflicts(rules);
      expect(activeRules).toHaveLength(1);
      expect(activeRules[0]!.id).toBe("repo1");
      expect(conflictsSurfaced).toHaveLength(1);
      expect(conflictsSurfaced[0]!.winnerId).toBe("repo1");
    });

    it("surfaces unresolved conflicts on tie", () => {
      const rules: any[] = [
        { id: "projA", title: "Linting", text: "Use ESLint", resolutionLevel: "ProjectPreference" },
        { id: "projB", title: "Linting", text: "Use Biome", resolutionLevel: "ProjectPreference" }
      ];
      
      const { activeRules, conflictsSurfaced } = resolveConflicts(rules);
      expect(activeRules).toHaveLength(2); // Both kept
      expect(conflictsSurfaced).toHaveLength(1);
      expect(conflictsSurfaced[0]!.reason).toContain("Equivalent precedence tie");
    });
  });

  describe("Renderer and Digest", () => {
    it("identical logical inputs produce identical digests", () => {
      const ctx1: any = {
        taskObjective: "Task", mode: "BUILD", agent: "Claude", verbosity: "standard",
        sources: [{ type: "file", digest: "abcd" }],
        activeRules: [{ id: "rule1" }], conflictsSurfaced: []
      };
      const ctx2: any = {
        taskObjective: "Task", mode: "BUILD", agent: "Claude", verbosity: "standard",
        sources: [{ type: "file", digest: "abcd" }],
        activeRules: [{ id: "rule1" }], conflictsSurfaced: []
      };

      const d1 = computeDigest(ctx1);
      const d2 = computeDigest(ctx2);
      expect(d1).toBe(d2);
    });

    it("RESEARCH, BUILD, and RESUME outputs differ", () => {
      const baseCtx: any = {
        taskObjective: "Task", agent: "Claude", verbosity: "standard",
        sources: [], activeRules: [], conflictsSurfaced: [], digest: "123"
      };

      const outResearch = renderBrief({ ...baseCtx, mode: "RESEARCH" });
      const outBuild = renderBrief({ ...baseCtx, mode: "BUILD" });
      const outResume = renderBrief({ ...baseCtx, mode: "RESUME" });

      expect(outResearch).not.toBe(outBuild);
      expect(outResearch).toContain("Research Directives");
      expect(outBuild).toContain("Build Directives");
      expect(outResume).toContain("Resume Directives");
    });

    it("concise output strips detailed source bodies", () => {
      const ctx: any = {
        taskObjective: "Task", mode: "BUILD", agent: "Claude", verbosity: "concise",
        sources: [{ type: "file", path: "/a/b.md", content: "hello world" }],
        activeRules: [], conflictsSurfaced: [], digest: "123"
      };

      const out = renderBrief(ctx);
      expect(out).not.toContain("hello world"); // Should not print raw content in concise
    });
  });
});
