import React from "react";
import ReactDOM from "react-dom/client";
import { CivicAuthProvider } from "@civic/auth/react";
import App from "./App";
import TestDashboardApp from "./TestDashboardApp";
import "./styles.css";

const CIVIC_CLIENT_ID = import.meta.env.VITE_CIVIC_CLIENT_ID || "";

function shouldRenderTestDashboard() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "tests";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CivicAuthProvider clientId={CIVIC_CLIENT_ID}>
      {shouldRenderTestDashboard() ? <TestDashboardApp /> : <App />}
    </CivicAuthProvider>
  </React.StrictMode>
);
