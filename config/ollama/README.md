# Local ingest model

Build the small local voice-note agent:

```powershell
ollama create agent-nudge-ingest:latest -f config/ollama/Modelfile.ingest
```

Use the OpenAI-compatible endpoint `http://127.0.0.1:11434/v1` with model
`agent-nudge-ingest:latest`. The ingestion adapter disables hidden reasoning and
requests the exact task JSON schema; Zod performs the final validation.

This profile targets a 4 GB-class quantized model and a 4,096-token context.
