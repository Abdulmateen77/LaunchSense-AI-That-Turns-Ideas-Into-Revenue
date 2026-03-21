import { runInternalTestSuite } from "../src/internalTests/suite.js";

const results = await runInternalTestSuite();
const passed = results.filter((result) => result.status === "passed").length;
const failed = results.length - passed;

for (const result of results) {
  const prefix = result.status === "passed" ? "PASS" : "FAIL";
  const summary = `${prefix} ${result.id} (${result.durationMs}ms)`;
  console.log(result.message ? `${summary} - ${result.message}` : summary);
}

console.log(`\nSummary: ${passed}/${results.length} passed, ${failed} failed.`);

if (failed > 0) {
  process.exitCode = 1;
}
