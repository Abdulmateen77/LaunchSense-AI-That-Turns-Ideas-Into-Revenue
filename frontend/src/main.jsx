import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import TestDashboardApp from "./TestDashboardApp";
import PreviewPage from "./components/PreviewPage";
import "./styles.css";

function getPreviewSlug() {
  const match = window.location.pathname.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function shouldRenderTestDashboard() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "tests";
}

const previewSlug = getPreviewSlug();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {previewSlug
      ? <PreviewPage slug={previewSlug} />
      : shouldRenderTestDashboard()
        ? <TestDashboardApp />
        : <App />}
  </React.StrictMode>
);
