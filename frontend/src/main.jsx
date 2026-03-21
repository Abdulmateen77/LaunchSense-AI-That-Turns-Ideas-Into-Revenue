import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import TestDashboardApp from "./TestDashboardApp";
import "./styles.css";

function shouldRenderTestDashboard() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "tests";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {shouldRenderTestDashboard() ? <TestDashboardApp /> : <App />}
  </React.StrictMode>
);
