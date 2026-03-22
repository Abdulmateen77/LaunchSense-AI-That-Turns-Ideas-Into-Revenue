import {
  normalizeHealthResponse,
  normalizeIntakeResponse,
  normalizeStoredPackage
} from "./contracts.js";
import { isMockMode } from "./runtimeConfig.js";
import { mockFetchStoredPackage, mockGetHealth, mockSendIntakeMessage } from "../mocks/mockBackend.js";

const DEFAULT_API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.DEV ? "" : "http://localhost:8000";
const ENV_API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_API_BASE_URL : undefined;

export const API_BASE_URL = (ENV_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

export function readErrorDetail(payload) {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item) => item?.msg || item?.message)
      .filter(Boolean)
      .join(", ");
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

export async function parseJsonResponse(response) {
  const raw = await response.text();
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    throw new Error(readErrorDetail(payload) || `Request failed with status ${response.status}`);
  }

  return payload;
}

export async function getHealth() {
  if (isMockMode()) {
    return normalizeHealthResponse(await mockGetHealth());
  }

  const response = await fetch(`${API_BASE_URL}/health`);
  return normalizeHealthResponse(await parseJsonResponse(response));
}

export async function getOpenApiDocument() {
  const response = await fetch(`${API_BASE_URL}/openapi.json`);
  return parseJsonResponse(response);
}

export async function sendIntakeMessage(input) {
  if (isMockMode()) {
    return normalizeIntakeResponse(await mockSendIntakeMessage(input));
  }

  const response = await fetch(`${API_BASE_URL}/intake/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return normalizeIntakeResponse(await parseJsonResponse(response));
}

export async function validateIdea(context) {
  const response = await fetch(`${API_BASE_URL}/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context })
  });
  return parseJsonResponse(response);
}

export async function fetchStoredPackage(slug) {
  if (isMockMode()) {
    return normalizeStoredPackage(await mockFetchStoredPackage(slug));
  }

  const response = await fetch(`${API_BASE_URL}/p/${encodeURIComponent(slug)}`);
  return normalizeStoredPackage(await parseJsonResponse(response));
}

export function buildAbsolutePackageUrl(pathname) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
