import { STREAM_EVENTS, THREAD_MODES } from "./contracts.js";

const THREAD_STAGES = Object.freeze({
  WELCOME: "welcome",
  INTAKE: "intake",
  CONTEXT_READY: "context_ready",
  RESEARCH: "research",
  OFFER: "offer",
  ASSETS: "assets",
  CRITIQUE: "critique",
  COMPLETE: "complete",
  ERROR: "error"
});

export const chatActionTypes = Object.freeze({
  SET_BACKEND_STATUS: "SET_BACKEND_STATUS",
  SELECT_THREAD: "SELECT_THREAD",
  TOGGLE_SIDEBAR: "TOGGLE_SIDEBAR",
  SET_SIDEBAR_COLLAPSED: "SET_SIDEBAR_COLLAPSED",
  CREATE_NEW_CHAT: "CREATE_NEW_CHAT",
  LOCAL_THREAD_NOTE_ADDED: "LOCAL_THREAD_NOTE_ADDED",
  INTAKE_REQUEST_STARTED: "INTAKE_REQUEST_STARTED",
  INTAKE_RESPONSE_RECEIVED: "INTAKE_RESPONSE_RECEIVED",
  THREAD_ERROR_RECORDED: "THREAD_ERROR_RECORDED",
  GENERATION_STARTED: "GENERATION_STARTED",
  GENERATION_EVENT_RECEIVED: "GENERATION_EVENT_RECEIVED",
  STORED_PACKAGE_RECEIVED: "STORED_PACKAGE_RECEIVED"
});

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessage({ role, kind = "text", text = "", data = null }) {
  return {
    id: createId("message"),
    role,
    kind,
    text,
    data
  };
}

export function createEmptyResults() {
  return {
    research: null,
    eval: null,
    offer: null,
    page: null,
    growth: null,
    critique: "",
    storedPackage: null
  };
}

export function createEmptyThread(index) {
  return {
    id: `thread-${Date.now()}-${index}`,
    sessionId: null,
    draft: {
      idea: "",
      audience: "",
      notes: ""
    },
    title: "New chat",
    preview: "",
    updatedAt: "Just now",
    phase: THREAD_MODES.WELCOME,
    stage: THREAD_STAGES.WELCOME,
    busy: false,
    messages: [],
    context: null,
    results: createEmptyResults(),
    error: null,
    workflow: {
      awaitingContextConfirmation: false,
      awaitingOfferConfirmation: false,
      awaitingRefinement: false
    },
    pendingRequests: {
      context: [],
      offer: [],
      refinement: []
    }
  };
}

export function createInitialAppState({ isSidebarCollapsed = false } = {}) {
  const thread = createEmptyThread(1);

  return {
    threads: [thread],
    activeThreadId: thread.id,
    isSidebarCollapsed,
    backendStatus: { status: "checking" }
  };
}

function buildTitle(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 34 ? `${compact.slice(0, 31)}...` : compact;
}

function moveThreadToTop(threads, threadId, updater) {
  const thread = threads.find((item) => item.id === threadId);

  if (!thread) {
    return threads;
  }

  const updated = updater(thread);
  return [updated, ...threads.filter((item) => item.id !== threadId)];
}

function updateThread(state, threadId, updater) {
  return {
    ...state,
    threads: moveThreadToTop(state.threads, threadId, updater)
  };
}

function getStageFromEvent(eventName, data) {
  if (eventName === STREAM_EVENTS.STATUS) {
    if (data?.step === 0) {
      return THREAD_STAGES.RESEARCH;
    }

    if (data?.step === 1) {
      return THREAD_STAGES.OFFER;
    }

    if (data?.step === 2) {
      return THREAD_STAGES.ASSETS;
    }

    if (data?.step === 3) {
      return THREAD_STAGES.CRITIQUE;
    }
  }

  if (eventName === STREAM_EVENTS.RESEARCH) {
    return THREAD_STAGES.RESEARCH;
  }

  if (eventName === STREAM_EVENTS.EVAL || eventName === STREAM_EVENTS.OFFER) {
    return THREAD_STAGES.OFFER;
  }

  if (eventName === STREAM_EVENTS.PAGE || eventName === STREAM_EVENTS.GROWTH) {
    return THREAD_STAGES.ASSETS;
  }

  if (eventName === STREAM_EVENTS.CRITIQUE_CHUNK) {
    return THREAD_STAGES.CRITIQUE;
  }

  if (eventName === STREAM_EVENTS.COMPLETE) {
    return THREAD_STAGES.COMPLETE;
  }

  if (eventName === STREAM_EVENTS.ERROR) {
    return THREAD_STAGES.ERROR;
  }

  return null;
}

export function sanitizeIntakeReply(reply, complete) {
  const text = typeof reply === "string" ? reply.trim() : "";

  if (!text) {
    return "";
  }

  if (complete && text.includes("CONTEXT_COMPLETE")) {
    return "I have enough context to build your launch package.";
  }

  return text;
}

function createContextMessage(context) {
  return createMessage({
    role: "assistant",
    kind: "context",
    data: { context }
  });
}

function createStatusText(data) {
  if (!data?.label) {
    return "";
  }

  return data.sub ? `${data.label}\n${data.sub}` : data.label;
}

function keepConversationMessages(messages) {
  return messages.filter((message) => message.kind === "text" || message.kind === "context");
}

function upsertCritiqueMessage(messages, critiqueText) {
  const existingIndex = messages.findIndex((message) => message.kind === "critique");

  if (existingIndex === -1) {
    return [
      ...messages,
      createMessage({
        role: "assistant",
        kind: "critique",
        text: critiqueText
      })
    ];
  }

  return messages.map((message, index) =>
    index === existingIndex
      ? {
          ...message,
          text: critiqueText
        }
      : message
  );
}

function getErrorRecoveryPhase(thread) {
  if (thread.context) {
    return THREAD_MODES.CONTEXT_READY;
  }

  if (thread.messages.length > 0) {
    return THREAD_MODES.INTAKE;
  }

  return THREAD_MODES.WELCOME;
}

function getErrorRecoveryStage(thread) {
  if (thread.context) {
    return THREAD_STAGES.CONTEXT_READY;
  }

  if (thread.messages.length > 0) {
    return THREAD_STAGES.INTAKE;
  }

  return THREAD_STAGES.WELCOME;
}

export function isConnectionFailure(errorMessage) {
  const text = errorMessage.toLowerCase();
  return text.includes("failed to fetch") || text.includes("networkerror") || text.includes("network error");
}

export function formatError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong.";
}

export function selectActiveThread(state) {
  return state.threads.find((thread) => thread.id === state.activeThreadId) ?? state.threads[0];
}

export function canStartGeneration(thread) {
  return Boolean(thread?.context) && !thread?.busy;
}

export function isComposerDisabled(thread) {
  return !thread || thread.busy || thread.phase === THREAD_MODES.GENERATING;
}

export function getComposerPlaceholder(thread) {
  if (!thread || thread.phase === THREAD_MODES.WELCOME) {
    return "Describe your business, customers, and the new idea you want to launch...";
  }

  if (thread.phase === THREAD_MODES.INTAKE) {
    return "Answer the intake question so LaunchSense can complete your context...";
  }

  if (thread.phase === THREAD_MODES.CONTEXT_READY) {
    return "Confirm or correct the context in chat, or use the inline button to generate.";
  }

  if (thread.phase === THREAD_MODES.GENERATING) {
    return "Launch package generation is in progress...";
  }

  if (thread.phase === THREAD_MODES.COMPLETE) {
    return "Ask for a refinement and it will be saved in this thread until the backend refinement loop is ready.";
  }

  if (thread.phase === THREAD_MODES.ERROR) {
    return "Add the correction or retry note you want to keep in this thread.";
  }

  return "Start a new chat to launch another idea.";
}

export function getThreadStatus(thread) {
  if (!thread) {
    return {
      label: "Waiting for brief",
      tone: "checking",
      detail: "Start with your business, current customers, and the new idea you want to launch."
    };
  }

  if (thread.phase === THREAD_MODES.WELCOME && thread.messages.length === 0) {
    return {
      label: "Waiting for brief",
      tone: "checking",
      detail: "Start with your business, current customers, and the new idea you want to launch."
    };
  }

  if (thread.phase === THREAD_MODES.INTAKE) {
    return thread.busy
      ? {
          label: "Waiting for intake reply",
          tone: "checking",
          detail: "LaunchSense is collecting the missing context in chat."
        }
      : {
          label: "Intake in progress",
          tone: "checking",
          detail: "Answer the next question to complete the context."
        };
  }

  if (thread.phase === THREAD_MODES.CONTEXT_READY) {
    return {
      label: "Context ready",
      tone: "connected",
      detail: "You can correct the summary in chat or start generation from the inline action."
    };
  }

  if (thread.phase === THREAD_MODES.GENERATING) {
    return {
      label: "Generation running",
      tone: "checking",
      detail: `Current stage: ${thread.stage}.`
    };
  }

  if (thread.phase === THREAD_MODES.COMPLETE) {
    const partial =
      !thread.results.offer ||
      !thread.results.page ||
      !thread.results.growth ||
      Boolean(thread.error);

    return partial
      ? {
          label: "Complete with partial failures",
          tone: "warning",
          detail: "Some sections are missing or degraded, but the thread preserved what succeeded."
        }
      : {
          label: "Launch package ready",
          tone: "connected",
          detail: "You can keep refinement requests in this thread while the backend loop is being finished."
        };
  }

  if (thread.phase === THREAD_MODES.ERROR) {
    return {
      label: "Needs attention",
      tone: "unavailable",
      detail: thread.error || "Something went wrong in this thread."
    };
  }

  return {
    label: "Thread active",
    tone: "checking",
    detail: "The conversation is active."
  };
}

export function chatReducer(state, action) {
  switch (action.type) {
    case chatActionTypes.SET_BACKEND_STATUS:
      return {
        ...state,
        backendStatus: action.payload
      };

    case chatActionTypes.SELECT_THREAD:
      return {
        ...state,
        activeThreadId: action.threadId
      };

    case chatActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        isSidebarCollapsed: !state.isSidebarCollapsed
      };

    case chatActionTypes.SET_SIDEBAR_COLLAPSED:
      return {
        ...state,
        isSidebarCollapsed: action.value
      };

    case chatActionTypes.CREATE_NEW_CHAT: {
      const thread = createEmptyThread(state.threads.length + 1);

      return {
        ...state,
        threads: [thread, ...state.threads],
        activeThreadId: thread.id
      };
    }

    case chatActionTypes.LOCAL_THREAD_NOTE_ADDED:
      return updateThread(state, action.threadId, (thread) => {
        const updatedContext =
          action.requestKind === "context" && thread.context
            ? {
                ...thread.context,
                notes: [thread.context.notes, `Correction request: ${action.message}`].filter(Boolean).join("\n")
              }
            : thread.context;

        const assistantText =
          action.requestKind === "context"
            ? "Saved as a context correction in this thread. You can keep refining here, or use the inline button above to generate with the current confirmed context."
            : action.requestKind === "offer"
              ? "Saved as an offer adjustment request in this thread. Once the backend confirmation loop is ready, this will map directly to the offer review step."
              : "Saved as a refinement request in this thread. Once the backend refinement loop is ready, this can be sent upstream without changing the UI.";

        return {
          ...thread,
          preview: action.message,
          updatedAt: "Just now",
          error: null,
          messages: [
            ...thread.messages,
            createMessage({
              role: "user",
              kind: "text",
              text: action.message
            }),
            createMessage({
              role: "assistant",
              kind: "text",
              text: assistantText
            }),
            ...(action.requestKind === "context" && updatedContext ? [createContextMessage(updatedContext)] : [])
          ],
          context: updatedContext,
          pendingRequests: {
            ...thread.pendingRequests,
            [action.requestKind]: [...thread.pendingRequests[action.requestKind], action.message]
          }
        };
      });

    case chatActionTypes.INTAKE_REQUEST_STARTED:
      return updateThread(state, action.threadId, (thread) => ({
        ...thread,
        title: thread.messages.length === 0 ? buildTitle(action.message) : thread.title,
        preview: action.message,
        updatedAt: "Just now",
        phase: THREAD_MODES.INTAKE,
        stage: THREAD_STAGES.INTAKE,
        busy: true,
        error: null,
        messages: [
          ...thread.messages,
          createMessage({
            role: "user",
            kind: "text",
            text: action.message
          })
        ]
      }));

    case chatActionTypes.INTAKE_RESPONSE_RECEIVED:
      return updateThread(state, action.threadId, (thread) => {
        const nextMessages = [...thread.messages];
        const replyText = sanitizeIntakeReply(action.response.reply, action.response.complete);

        if (replyText) {
          nextMessages.push(
            createMessage({
              role: "assistant",
              kind: "text",
              text: replyText
            })
          );
        }

        if (action.response.complete && action.response.context) {
          nextMessages.push(createContextMessage(action.response.context));
        }

        return {
          ...thread,
          sessionId: action.response.session_id,
          busy: false,
          phase: action.response.complete ? THREAD_MODES.CONTEXT_READY : THREAD_MODES.INTAKE,
          stage: action.response.complete ? THREAD_STAGES.CONTEXT_READY : THREAD_STAGES.INTAKE,
          preview: action.response.complete ? "Context ready for generation" : replyText || thread.preview,
          updatedAt: "Just now",
          context: action.response.context || thread.context,
          messages: nextMessages,
          workflow: {
            ...thread.workflow,
            awaitingContextConfirmation: action.response.complete,
            awaitingOfferConfirmation: false,
            awaitingRefinement: false
          }
        };
      });

    case chatActionTypes.THREAD_ERROR_RECORDED:
      return updateThread(state, action.threadId, (thread) => ({
        ...thread,
        busy: false,
        phase: THREAD_MODES.ERROR,
        stage: THREAD_STAGES.ERROR,
        error: action.errorMessage,
        preview: action.errorMessage,
        updatedAt: "Just now",
        recoverablePhase: getErrorRecoveryPhase(thread),
        recoverableStage: getErrorRecoveryStage(thread),
        messages: [
          ...thread.messages,
          createMessage({
            role: "system",
            kind: "error",
            text: action.errorMessage
          })
        ]
      }));

    case chatActionTypes.GENERATION_STARTED:
      return updateThread(state, action.threadId, (thread) => ({
        ...thread,
        busy: true,
        phase: THREAD_MODES.GENERATING,
        stage: THREAD_STAGES.RESEARCH,
        error: null,
        preview: "Starting generation...",
        updatedAt: "Just now",
        results: createEmptyResults(),
        messages: keepConversationMessages(thread.messages),
        workflow: {
          ...thread.workflow,
          awaitingContextConfirmation: false,
          awaitingOfferConfirmation: false,
          awaitingRefinement: false
        }
      }));

    case chatActionTypes.GENERATION_EVENT_RECEIVED:
      return updateThread(state, action.threadId, (thread) => {
        let nextMessages = thread.messages;
        let nextResults = thread.results;
        let nextPhase = thread.phase;
        let nextBusy = thread.busy;
        let nextPreview = thread.preview;
        let nextError = thread.error;
        let nextStage = getStageFromEvent(action.eventName, action.data) || thread.stage;
        let nextWorkflow = thread.workflow;

        switch (action.eventName) {
          case STREAM_EVENTS.STATUS: {
            const statusText = createStatusText(action.data);
            nextPhase = THREAD_MODES.GENERATING;
            nextBusy = true;
            nextPreview = action.data?.label || thread.preview;

            if (statusText && thread.messages[thread.messages.length - 1]?.text !== statusText) {
              nextMessages = [
                ...thread.messages,
                createMessage({
                  role: "system",
                  kind: "status",
                  text: statusText
                })
              ];
            }
            break;
          }

          case STREAM_EVENTS.RESEARCH:
            nextResults = {
              ...thread.results,
              research: action.data
            };
            nextMessages = [
              ...thread.messages,
              createMessage({
                role: "assistant",
                kind: "research",
                data: action.data
              })
            ];
            nextPreview = "Research ready";
            break;

          case STREAM_EVENTS.EVAL:
            nextResults = {
              ...thread.results,
              eval: action.data
            };
            break;

          case STREAM_EVENTS.OFFER:
            nextResults = {
              ...thread.results,
              offer: action.data
            };
            nextMessages = [
              ...thread.messages,
              createMessage({
                role: "assistant",
                kind: "offer",
                data: {
                  offer: action.data,
                  eval: thread.results.eval
                }
              })
            ];
            nextPreview = action.data?.headline || "Offer ready";
            nextWorkflow = {
              ...thread.workflow,
              awaitingOfferConfirmation: false
            };
            break;

          case STREAM_EVENTS.PAGE:
            nextResults = {
              ...thread.results,
              page: action.data
            };
            nextPreview = action.data?.slug ? `Page ready: ${action.data.slug}` : "Page ready";
            break;

          case STREAM_EVENTS.GROWTH:
            nextResults = {
              ...thread.results,
              growth: action.data
            };
            nextMessages = [
              ...thread.messages,
              createMessage({
                role: "assistant",
                kind: "assets",
                data: {
                  page: thread.results.page,
                  growth: action.data
                }
              })
            ];
            nextPreview = "Assets ready";
            break;

          case STREAM_EVENTS.CRITIQUE_CHUNK: {
            const critiqueText = `${thread.results.critique}${action.data?.text ?? ""}`;
            nextResults = {
              ...thread.results,
              critique: critiqueText
            };
            nextMessages = upsertCritiqueMessage(thread.messages, critiqueText);
            nextPreview = "Critique streaming";
            break;
          }

          case STREAM_EVENTS.COMPLETE:
            nextBusy = false;
            nextPhase = THREAD_MODES.COMPLETE;
            nextStage = THREAD_STAGES.COMPLETE;
            nextPreview = "Launch package ready";
            nextWorkflow = {
              ...thread.workflow,
              awaitingRefinement: true
            };

            if (action.data?.slug && !thread.results.page) {
              nextResults = {
                ...thread.results,
                page: {
                  slug: action.data.slug,
                  url: `/p/${action.data.slug}`,
                  absoluteUrl: action.absoluteUrl
                }
              };
            }
            break;

          case STREAM_EVENTS.ERROR:
            nextBusy = false;
            nextPhase = THREAD_MODES.ERROR;
            nextStage = THREAD_STAGES.ERROR;
            nextError = action.data?.message || "Generation failed.";
            nextPreview = nextError;
            nextMessages = [
              ...thread.messages,
              createMessage({
                role: "system",
                kind: "error",
                text: nextError
              })
            ];
            break;

          default:
            break;
        }

        return {
          ...thread,
          busy: nextBusy,
          phase: nextPhase,
          stage: nextStage,
          preview: nextPreview,
          updatedAt: "Just now",
          error: nextError,
          results: nextResults,
          messages: nextMessages,
          workflow: nextWorkflow
        };
      });

    case chatActionTypes.STORED_PACKAGE_RECEIVED:
      return updateThread(state, action.threadId, (thread) => ({
        ...thread,
        updatedAt: "Just now",
        results: {
          ...thread.results,
          storedPackage: action.storedPackage
        }
      }));

    default:
      return state;
  }
}

export { THREAD_STAGES };
