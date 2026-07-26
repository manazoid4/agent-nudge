/// <reference types="vite/client" />

interface Window {
  agentNudge?: {
    endpoint: string;
    platform: string;
    version: string;
    request: (
      path: string,
      init?: { method?: string; body?: string },
    ) => Promise<{
      ok: boolean;
      status: number;
      body: string;
      contentType: string;
    }>;
  };
}
