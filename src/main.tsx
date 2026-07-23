import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.js";
import { AssurancePage } from "./ui/AssurancePage.js";
import "./ui/styles.css";
import "./ui/audit-fixes.css";

const isAssurancePage = location.pathname === "/assurance";
if (isAssurancePage)
  document.title = "Agent Nudge Assurance — Provider-neutral agent guardrails";

const content = isAssurancePage ? <AssurancePage /> : <App />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>{content}</StrictMode>,
);
