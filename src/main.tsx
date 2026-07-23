import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.js";
import { AssurancePage } from "./ui/AssurancePage.js";
import "./ui/styles.css";
import "./ui/audit-fixes.css";

const content =
  location.pathname === "/assurance" ? <AssurancePage /> : <App />;

createRoot(document.getElementById("root")!).render(
  <StrictMode>{content}</StrictMode>,
);
