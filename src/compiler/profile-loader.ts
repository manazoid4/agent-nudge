import { readFileSync, existsSync } from "node:fs";
import { ProfileRule } from "./types.js";

// Safe, generic fallback rules containing no Maz-specific logic.
const FALLBACK_RULES: ProfileRule[] = [
  {
    id: "fallback-safe-execution",
    title: "Safe Execution",
    text: "Follow the user instructions safely.",
    scope: "personal",
    status: "approved",
    confidence: "high",
    applicableModes: ["*"],
    applicableAgents: ["*"],
    sourceReferences: ["built-in-fallback"],
    enabled: true,
    priority: 99
  }
];

export function loadProfile(profilePath: string): ProfileRule[] {
  if (!existsSync(profilePath)) {
    return FALLBACK_RULES;
  }

  try {
    const raw = readFileSync(profilePath, "utf-8");
    const parsed = JSON.parse(raw);
    
    if (parsed.version !== "1.0" || !Array.isArray(parsed.rules)) {
      throw new Error("Malformed profile schema: Missing version or rules array.");
    }

    const validRules: ProfileRule[] = [];

    for (const r of parsed.rules) {
      if (!r.id || !r.text || !r.scope || !r.status) {
        throw new Error(`Malformed rule detected: ${JSON.stringify(r)}`);
      }
      
      // Ignore unapproved or disabled
      if (r.status !== "approved" || r.enabled === false) {
        continue;
      }
      
      validRules.push(r as ProfileRule);
    }

    return validRules;
  } catch (e: any) {
    throw new Error(`Failed to load profile from ${profilePath}: ${e.message}`);
  }
}
