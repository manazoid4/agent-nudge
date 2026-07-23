import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.js";
import { AssurancePage } from "./ui/AssurancePage.js";
import { ReplayLabPage } from "./ui/ReplayLabPage.js";
import "./ui/styles.css";
import "./ui/audit-fixes.css";

const isAssurancePage = location.pathname === "/assurance";
const isReplayLabPage = location.pathname === "/replay";
if (isAssurancePage)
  document.title = "Agent Nudge Assurance — Provider-neutral agent guardrails";
if (isReplayLabPage)
  document.title = "Agent Nudge Replay Lab — Tune assurance policies";

const content = isAssurancePage ? (
  <AssurancePage />
) : isReplayLabPage ? (
  <ReplayLabPage />
) : (
  <App />
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{content}</StrictMode>,
);
