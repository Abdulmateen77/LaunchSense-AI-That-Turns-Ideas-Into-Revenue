const STORAGE_KEY = "launchsense_state_v1";

/**
 * Save threads + activeThreadId to localStorage.
 * Strips busy/error transient state so a refresh never shows a stuck spinner.
 */
export function saveState(state) {
  try {
    const sanitized = {
      activeThreadId: state.activeThreadId,
      isSidebarCollapsed: state.isSidebarCollapsed,
      threads: state.threads.map((t) => ({
        ...t,
        busy: false,
        // If thread was mid-generation, roll it back to the last stable phase
        phase: midGenerationPhase(t.phase) ? recoverPhase(t) : t.phase,
        stage: midGenerationPhase(t.phase) ? recoverStage(t) : t.stage,
        error: midGenerationPhase(t.phase) ? null : t.error,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Load persisted state, or return null if nothing saved. */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Clear persisted state (e.g. on hard reset). */
export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function midGenerationPhase(phase) {
  return phase === "generating" || phase === "validating";
}

function recoverPhase(thread) {
  if (thread.context) return "validation_ready";
  if (thread.messages.length > 0) return "intake";
  return "welcome";
}

function recoverStage(thread) {
  if (thread.context) return "validation_ready";
  if (thread.messages.length > 0) return "intake";
  return "welcome";
}
