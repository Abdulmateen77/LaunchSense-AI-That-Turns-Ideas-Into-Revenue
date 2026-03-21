import { useEffect, useMemo, useState } from "react";
import { runInternalTestSuite } from "./internalTests/suite.js";
import { runBrowserOnlyTestSuite } from "./internalTests/componentSuite.jsx";
import { getApiMode, getMockScenario } from "./lib/runtimeConfig.js";
import { mockQaFixtures } from "./mocks/fixtures.js";

function getSummary(results) {
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed
  };
}

export default function TestDashboardApp() {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [lastRunAt, setLastRunAt] = useState(null);

  async function runTests() {
    setStatus("running");
    const [logicResults, componentResults] = await Promise.all([
      runInternalTestSuite(),
      runBrowserOnlyTestSuite()
    ]);
    const nextResults = [...logicResults, ...componentResults];
    setResults(nextResults);
    setLastRunAt(new Date());
    setStatus(nextResults.every((result) => result.status === "passed") ? "passed" : "failed");
  }

  useEffect(() => {
    void runTests();
  }, []);

  const summary = useMemo(() => getSummary(results), [results]);
  const groupedResults = useMemo(() => {
    return results.reduce((accumulator, result) => {
      const category = result.category || "uncategorized";
      accumulator[category] = accumulator[category] || [];
      accumulator[category].push(result);
      return accumulator;
    }, {});
  }, [results]);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-hero">
        <div>
          <p className="dashboard-hero__eyebrow">Internal Frontend Tests</p>
          <h1>Frontend Diagnostics Dashboard</h1>
          <p className="dashboard-hero__copy">
            This runs the internal frontend test suite against the shared mock and reducer logic without relying on the
            backend being finished.
          </p>
        </div>

        <div className="dashboard-hero__actions">
          <a className="dashboard-link" href="./">
            Open chat app
          </a>
          <button type="button" className="dashboard-run-button" onClick={() => void runTests()} disabled={status === "running"}>
            {status === "running" ? "Running tests..." : "Run tests again"}
          </button>
        </div>
      </header>

      <section className="dashboard-summary-grid">
        <article className="dashboard-summary-card">
          <span className="dashboard-summary-card__label">API mode</span>
          <strong>{getApiMode()}</strong>
        </article>

        <article className="dashboard-summary-card">
          <span className="dashboard-summary-card__label">Mock scenario</span>
          <strong>{getMockScenario()}</strong>
        </article>

        <article className="dashboard-summary-card">
          <span className="dashboard-summary-card__label">Tests passing</span>
          <strong>
            {summary.passed}/{summary.total || 0}
          </strong>
        </article>

        <article className={`dashboard-summary-card ${summary.failed ? "dashboard-summary-card--warning" : ""}`}>
          <span className="dashboard-summary-card__label">Failures</span>
          <strong>{summary.failed}</strong>
        </article>
      </section>

      <section className="dashboard-run-meta">
        <span className={`status-pill status-pill--${status === "failed" ? "unavailable" : status === "passed" ? "connected" : "checking"}`}>
          {status === "running" ? "Running" : status === "passed" ? "All passing" : status === "failed" ? "Failures detected" : "Idle"}
        </span>

        <span className="dashboard-run-meta__text">
          {lastRunAt ? `Last run: ${lastRunAt.toLocaleTimeString()}` : "No test run recorded yet."}
        </span>
      </section>

      <main className="dashboard-groups">
        {Object.entries(groupedResults).map(([category, items]) => (
          <section key={category} className="dashboard-group">
            <div className="dashboard-group__header">
              <h2>{category}</h2>
              <span className="status-pill">{items.length} tests</span>
            </div>

            <div className="dashboard-results">
              {items.map((result) => (
                <article
                  key={result.id}
                  className={`dashboard-result-card ${
                    result.status === "passed" ? "dashboard-result-card--passed" : "dashboard-result-card--failed"
                  }`}
                >
                  <div className="dashboard-result-card__top">
                    <strong>{result.title}</strong>
                    <span className="status-pill">{result.durationMs} ms</span>
                  </div>

                  <p className="dashboard-result-card__id">{result.id}</p>
                  <p className="dashboard-result-card__status">
                    {result.status === "passed" ? "Passed" : `Failed: ${result.message || "Unknown error"}`}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="dashboard-group">
          <div className="dashboard-group__header">
            <h2>QA fixtures</h2>
            <span className="status-pill">{mockQaFixtures.length} scenarios</span>
          </div>

          <div className="dashboard-results">
            {mockQaFixtures.map((fixture) => (
              <article key={fixture.id} className="dashboard-result-card">
                <div className="dashboard-result-card__top">
                  <strong>{fixture.title}</strong>
                  <span className="status-pill">{fixture.category}</span>
                </div>

                <p className="dashboard-result-card__id">
                  ?apiMode=mock&mockScenario={fixture.scenario}
                </p>
                <p className="dashboard-result-card__status">{fixture.expected}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
