export const API_MODES = Object.freeze({
  LIVE: "live",
  MOCK: "mock"
});

const DEFAULT_API_MODE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_MODE === API_MODES.MOCK
    ? API_MODES.MOCK
    : API_MODES.LIVE;

const DEFAULT_MOCK_SCENARIO =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_MOCK_SCENARIO
    ? import.meta.env.VITE_MOCK_SCENARIO
    : "happy_path";

function readQueryParam(name) {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export function getApiMode() {
  const queryValue = readQueryParam("apiMode");
  return queryValue === API_MODES.MOCK ? API_MODES.MOCK : DEFAULT_API_MODE;
}

export function getMockScenario() {
  return readQueryParam("mockScenario") || DEFAULT_MOCK_SCENARIO;
}

export function isMockMode() {
  return getApiMode() === API_MODES.MOCK;
}

export function isSseDebugEnabled() {
  const queryValue = readQueryParam("debugSse");
  return (
    queryValue === "1" ||
    queryValue === "true" ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEBUG_SSE === "1")
  );
}
