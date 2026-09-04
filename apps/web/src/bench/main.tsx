import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../app/ErrorBoundary";
import { BenchApp } from "./BenchApp";
import "./bench.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BenchApp />
    </ErrorBoundary>
  </StrictMode>,
);
