import { ProfileRule } from "./types.js";

// Note: The precedence values map smaller numbers to higher precedence.
const PRECEDENCE_MAP: Record<string, number> = {
  TaskInstruction: 1,
  RepoConstitution: 2,
  ProjectPreference: 3,
  PersonalDefault: 4,
  HistoricalPattern: 5,
  ModelSuggestion: 6,
};

// Internal representation for resolution
interface ResolvableRule extends ProfileRule {
  resolutionLevel: keyof typeof PRECEDENCE_MAP;
}

export function resolveConflicts(rawRules: ResolvableRule[]): {
  activeRules: ProfileRule[];
  conflictsSurfaced: {
    overwrittenId: string;
    winnerId: string;
    reason: string;
  }[];
} {
  const activeRulesMap = new Map<string, ResolvableRule>();
  const conflictsSurfaced: {
    overwrittenId: string;
    winnerId: string;
    reason: string;
  }[] = [];

  for (const rule of rawRules) {
    if (!rule.title) {
      // Un-keyed rules (no title overlap) never conflict
      activeRulesMap.set(rule.id, rule);
      continue;
    }

    const existing = activeRulesMap.get(rule.title);
    if (!existing) {
      activeRulesMap.set(rule.title, rule);
      continue;
    }

    const newWeight = PRECEDENCE_MAP[rule.resolutionLevel] || 99;
    const existingWeight = PRECEDENCE_MAP[existing.resolutionLevel] || 99;

    if (newWeight < existingWeight) {
      // New rule wins
      conflictsSurfaced.push({
        overwrittenId: existing.id,
        winnerId: rule.id,
        reason: `${rule.resolutionLevel} overrides ${existing.resolutionLevel}`,
      });
      activeRulesMap.set(rule.title, rule);
    } else if (newWeight > existingWeight) {
      // Existing rule wins
      conflictsSurfaced.push({
        overwrittenId: rule.id,
        winnerId: existing.id,
        reason: `${existing.resolutionLevel} overrides ${rule.resolutionLevel}`,
      });
    } else {
      // Tie: Keep both but surface the conflict.
      conflictsSurfaced.push({
        overwrittenId: existing.id, // neither is truly overwritten, but recorded
        winnerId: rule.id,
        reason: `Equivalent precedence tie on "${rule.title}". Both kept.`,
      });
      // Suffix the ID so both survive in the map
      activeRulesMap.set(`${rule.title}_${rule.id}`, rule);
    }
  }

  // Deduplicate identical rule texts
  const finalRules: ProfileRule[] = [];
  const textSet = new Set<string>();

  for (const r of activeRulesMap.values()) {
    if (!textSet.has(r.text)) {
      textSet.add(r.text);
      finalRules.push(r);
    }
  }

  return { activeRules: finalRules, conflictsSurfaced };
}
