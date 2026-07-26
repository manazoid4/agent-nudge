# Assurance Replay Fixtures

Fixtures in this directory are versioned, deterministic, and public-safe.

They may contain:

- event IDs and sequence numbers;
- rule IDs;
- assurance scores;
- expected CLEAR, REVIEW, or HOLD decisions;
- short labels;
- evidence references.

They must not contain:

- prompts or model responses;
- source-file bodies;
- complete command output or logs;
- credentials or environment values;
- private repository, customer, or person names;
- raw provider payloads.

Run the bundled fixture with:

```powershell
npm run assure -- replay docs/fixtures/replay-conflicts.json 45 100
```

Changing thresholds changes candidate decisions without modifying the fixture. The same fixture and policy produce the same ordered decisions and digest.
