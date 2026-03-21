export const THREAD_MODES = Object.freeze({
  WELCOME: "welcome",
  INTAKE: "intake",
  CONTEXT_READY: "context_ready",
  GENERATING: "generating",
  COMPLETE: "complete",
  ERROR: "error"
});

export const STREAM_EVENTS = Object.freeze({
  STATUS: "status",
  RESEARCH: "research",
  EVAL: "eval",
  OFFER: "offer",
  PAGE: "page",
  GROWTH: "growth",
  CRITIQUE_CHUNK: "critique_chunk",
  COMPLETE: "complete",
  ERROR: "error"
});

export const KNOWN_STREAM_EVENTS = new Set(Object.values(STREAM_EVENTS));

/**
 * @typedef {{
 *   idea: string,
 *   niche: string,
 *   target_customer: string,
 *   core_pain: string,
 *   existing_solutions: string,
 *   notes: string
 * }} EnrichedContext
 */

/**
 * @typedef {{
 *   session_id?: string | null,
 *   message: string
 * }} IntakeMessageRequest
 */

/**
 * @typedef {{
 *   session_id: string,
 *   reply: string,
 *   complete: boolean,
 *   context: EnrichedContext | null
 * }} IntakeMessageResponse
 */

/**
 * @typedef {{
 *   event: string,
 *   data: unknown
 * }} StreamFrame
 */

function ensureObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function ensureString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function ensureBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
}

export function normalizeHealthResponse(payload) {
  const data = ensureObject(payload, "Health response");
  return {
    status: ensureString(data.status, "Health status")
  };
}

export function normalizeContext(payload) {
  const context = ensureObject(payload, "Context");

  return {
    idea: ensureString(context.idea, "Context idea"),
    niche: ensureString(context.niche, "Context niche"),
    target_customer: ensureString(context.target_customer, "Context target_customer"),
    core_pain: ensureString(context.core_pain, "Context core_pain"),
    existing_solutions: ensureString(context.existing_solutions, "Context existing_solutions"),
    notes: typeof context.notes === "string" ? context.notes : ""
  };
}

export function normalizeIntakeResponse(payload) {
  const response = ensureObject(payload, "Intake response");
  const complete = ensureBoolean(response.complete, "Intake complete");
  const context = response.context == null ? null : normalizeContext(response.context);

  if (complete && !context) {
    throw new Error("Completed intake responses must include context.");
  }

  return {
    session_id: ensureString(response.session_id, "Intake session_id"),
    reply: typeof response.reply === "string" ? response.reply : "",
    complete,
    context
  };
}

export function normalizeStoredPackage(payload) {
  const data = ensureObject(payload, "Stored package");

  return {
    slug: typeof data.slug === "string" ? data.slug : "",
    context: data.context && typeof data.context === "object" ? data.context : null,
    evidence: data.evidence && typeof data.evidence === "object" ? data.evidence : null,
    offer: data.offer && typeof data.offer === "object" ? data.offer : null,
    landing_page: data.landing_page && typeof data.landing_page === "object" ? data.landing_page : null,
    growth_pack: data.growth_pack && typeof data.growth_pack === "object" ? data.growth_pack : null
  };
}

export function normalizeStreamFrame(payload) {
  const frame = ensureObject(payload, "SSE frame");
  const event = typeof frame.event === "string" ? frame.event : "";

  if (!event) {
    throw new Error("SSE frame event must be a non-empty string.");
  }

  return {
    event,
    data: Object.prototype.hasOwnProperty.call(frame, "data") ? frame.data : null,
    known: KNOWN_STREAM_EVENTS.has(event)
  };
}
