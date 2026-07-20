const rules: Array<[string, RegExp]> = [
  [
    "private-key",
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi,
  ],
  ["bearer-token", /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g],
  [
    "generic-secret",
    /\b(api[_-]?key|secret|password|token)\s*[:=]\s*["']?[^\s,"']{8,}/gi,
  ],
  ["env-value", /(^|\s)[A-Z][A-Z0-9_]{2,}\s*=\s*[^\s]+/gm],
];

export function redactText(input: string): {
  value: string;
  applied: boolean;
  rules: string[];
} {
  let value = input;
  const appliedRules: string[] = [];
  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) {
      appliedRules.push(name);
      pattern.lastIndex = 0;
      value = value.replace(pattern, `[REDACTED:${name}]`);
    }
  }
  return { value, applied: appliedRules.length > 0, rules: appliedRules };
}

export function sanitizeObject(value: unknown): unknown {
  if (typeof value === "string") return redactText(value).value;
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeObject(item)]),
    );
  }
  return value;
}
