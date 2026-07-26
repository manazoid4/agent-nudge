export type PromptMode = "RESEARCH" | "PLAN" | "BUILD" | "REVIEW" | "RESUME";

export type AgentRole =
  "Claude" | "Codex" | "OpenCode" | "Grok" | "Hermes" | "Generic";

export type OutputVerbosity = "concise" | "standard" | "detailed";

export type ResolutionLevel =
  | "TaskInstruction"
  | "RepoConstitution"
  | "ProjectPreference"
  | "PersonalDefault"
  | "HistoricalPattern"
  | "ModelSuggestion";

export type RuleScope =
  "personal" | "project" | "tool" | "temporary" | "historical";

export type RuleStatus = "approved" | "candidate" | "rejected" | "disabled";

export interface ProfileRule {
  id: string;
  title: string;
  text: string;
  scope: RuleScope;
  status: RuleStatus;
  confidence: string;
  applicableModes: (PromptMode | "*")[];
  applicableAgents: (AgentRole | "*")[];
  sourceReferences: string[];
  enabled: boolean;
  priority: number;
  optionalProjectRestrictions?: string[];
  optionalToolRestrictions?: string[];
}

export interface ContextSource {
  path: string;
  type: "file" | "git" | "command";
  content: string;
  lastModified?: Date;
  trustLevel: "Task" | "Repo" | "Unknown";
  digest: string;
}

export interface SkippedSource {
  path: string;
  reason: string;
}

export interface ResolvedContext {
  taskObjective: string;
  mode: PromptMode;
  agent: AgentRole;
  verbosity: OutputVerbosity;
  sources: ContextSource[];
  skippedSources: SkippedSource[];
  activeRules: ProfileRule[];
  conflictsSurfaced: {
    overwrittenId: string;
    winnerId: string;
    reason: string;
  }[];
  digest: string;
}
