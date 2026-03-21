import { useEffect, useReducer, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { WelcomePanel } from "./components/WelcomePanel";
import { buildAbsolutePackageUrl, fetchStoredPackage, getHealth, sendIntakeMessage, validateIdea } from "./lib/api";
import {
  canStartGeneration,
  chatActionTypes,
  chatReducer,
  createInitialAppState,
  formatError,
  getComposerPlaceholder,
  getThreadStatus,
  isComposerDisabled,
  isConnectionFailure,
  selectActiveThread
} from "./lib/chatState";
import { STREAM_EVENTS, THREAD_MODES } from "./lib/contracts";
import { streamGeneration } from "./lib/sse";

const suggestedPrompts = [
  {
    title: "AI service for consultants",
    label: "I run a consulting practice for HR teams and want to launch an AI onboarding audit service."
  },
  {
    title: "New offer for agencies",
    label: "I own a small estate agency and want to launch an AI property listing package for solo agents."
  },
  {
    title: "Productized coaching offer",
    label: "I help founders with sales coaching and want a fixed launch sprint for pre-seed SaaS teams."
  },
  {
    title: "Digital service idea",
    label: "I run a bookkeeping business and want to offer a monthly cash-flow forecast service for freelancers."
  }
];

function createInitialState() {
  return createInitialAppState({
    isSidebarCollapsed: typeof window !== "undefined" ? window.innerWidth < 860 : false
  });
}

export default function App() {
  const [state, dispatch] = useReducer(chatReducer, undefined, createInitialState);
  const generationControllersRef = useRef(new Map());
  const activeThread = selectActiveThread(state);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        await getHealth();

        if (!cancelled) {
          dispatch({
            type: chatActionTypes.SET_BACKEND_STATUS,
            payload: { status: "connected" }
          });
        }
      } catch {
        if (!cancelled) {
          dispatch({
            type: chatActionTypes.SET_BACKEND_STATUS,
            payload: { status: "unavailable" }
          });
        }
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      generationControllersRef.current.forEach(({ controller, timeoutId }) => {
        controller.abort();

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

      generationControllersRef.current.clear();
    },
    []
  );

  function clearGenerationController(threadId) {
    const entry = generationControllersRef.current.get(threadId);

    if (!entry) {
      return;
    }

    if (entry.timeoutId) {
      clearTimeout(entry.timeoutId);
    }

    generationControllersRef.current.delete(threadId);
  }

  function collapseSidebarOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 860) {
      dispatch({
        type: chatActionTypes.SET_SIDEBAR_COLLAPSED,
        value: true
      });
    }
  }

  function handleSelectThread(threadId) {
    dispatch({
      type: chatActionTypes.SELECT_THREAD,
      threadId
    });
    collapseSidebarOnMobile();
  }

  function handleNewChat() {
    dispatch({ type: chatActionTypes.CREATE_NEW_CHAT });
    collapseSidebarOnMobile();
  }

  async function handleSendMessage(value) {
    const trimmed = value.trim();

    if (!trimmed || !activeThread || activeThread.busy) {
      return false;
    }

    if (activeThread.phase === THREAD_MODES.COMPLETE) {
      dispatch({
        type: chatActionTypes.LOCAL_THREAD_NOTE_ADDED,
        threadId: activeThread.id,
        message: trimmed,
        requestKind: "refinement"
      });
      return true;
    }

    if (activeThread.phase === THREAD_MODES.ERROR && activeThread.context) {
      dispatch({
        type: chatActionTypes.LOCAL_THREAD_NOTE_ADDED,
        threadId: activeThread.id,
        message: trimmed,
        requestKind:
          activeThread.results.offer || activeThread.results.page || activeThread.results.growth
            ? "refinement"
            : "context"
      });
      return true;
    }

    if (activeThread.phase !== THREAD_MODES.WELCOME && activeThread.phase !== THREAD_MODES.INTAKE) {
      return false;
    }

    const threadId = activeThread.id;

    dispatch({
      type: chatActionTypes.INTAKE_REQUEST_STARTED,
      threadId,
      message: trimmed
    });

    try {
      const response = await sendIntakeMessage({
        session_id: activeThread.sessionId,
        message: trimmed
      });

      dispatch({
        type: chatActionTypes.SET_BACKEND_STATUS,
        payload: { status: "connected" }
      });

      dispatch({
        type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
        threadId,
        response
      });

      // Auto-validate once intake is complete
      if (response.complete && response.context) {
        await runValidation(threadId, response.context);
      }
    } catch (error) {
      const errorMessage = formatError(error);

      if (isConnectionFailure(errorMessage)) {
        dispatch({
          type: chatActionTypes.SET_BACKEND_STATUS,
          payload: { status: "unavailable" }
        });
      }

      dispatch({
        type: chatActionTypes.THREAD_ERROR_RECORDED,
        threadId,
        errorMessage
      });
    }

    return true;
  }

  async function runValidation(threadId, context) {
    dispatch({ type: chatActionTypes.VALIDATION_STARTED, threadId });
    try {
      const validation = await validateIdea(context);
      dispatch({ type: chatActionTypes.VALIDATION_RECEIVED, threadId, validation });
    } catch (error) {
      const errorMessage = formatError(error);
      dispatch({ type: chatActionTypes.THREAD_ERROR_RECORDED, threadId, errorMessage });
    }
  }

  function handleConfirmValidation() {
    startGeneration(activeThread?.id);
  }

  async function handleSelectAlternative(alt) {
    const threadId = activeThread?.id;
    if (!threadId || !activeThread?.context) return;

    // Patch the context idea with the chosen alternative and re-validate
    const updatedContext = {
      ...activeThread.context,
      idea: alt.title,
      core_pain: alt.description,
      notes: `Alternative angle: ${alt.why_stronger}`
    };

    dispatch({
      type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
      threadId,
      response: {
        session_id: activeThread.sessionId || threadId,
        reply: `Switching to: "${alt.title}" — ${alt.description}`,
        complete: true,
        context: updatedContext
      }
    });

    await runValidation(threadId, updatedContext);
  }

  async function startGeneration(threadId = activeThread?.id) {
    if (!threadId) {
      return;
    }

    const thread = state.threads.find((item) => item.id === threadId);

    if (!thread || !thread.context || thread.busy) {
      return;
    }

    dispatch({
      type: chatActionTypes.GENERATION_STARTED,
      threadId
    });

    try {
      clearGenerationController(threadId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 90000);

      generationControllersRef.current.set(threadId, {
        controller,
        timeoutId
      });

      await streamGeneration(
        {
          idea: thread.context.idea,
          context: thread.context
        },
        {
          signal: controller.signal,
          onEvent: async (eventName, data) => {
            const nextData =
              eventName === STREAM_EVENTS.PAGE && data?.url
                ? {
                    ...data,
                    absoluteUrl: buildAbsolutePackageUrl(data.url)
                  }
                : data;

            dispatch({
              type: chatActionTypes.GENERATION_EVENT_RECEIVED,
              threadId,
              eventName,
              data: nextData,
              absoluteUrl:
                eventName === STREAM_EVENTS.COMPLETE && data?.slug
                  ? buildAbsolutePackageUrl(`/p/${data.slug}`)
                  : null
            });

            if (eventName === STREAM_EVENTS.COMPLETE && data?.slug) {
              try {
                const storedPackage = await fetchStoredPackage(data.slug);

                dispatch({
                  type: chatActionTypes.STORED_PACKAGE_RECEIVED,
                  threadId,
                  storedPackage
                });
              } catch {
                // Stored package retrieval is optional. Keep streamed results intact if it fails.
              }
            }
          }
        }
      );

      clearGenerationController(threadId);

      dispatch({
        type: chatActionTypes.SET_BACKEND_STATUS,
        payload: { status: "connected" }
      });
    } catch (error) {
      clearGenerationController(threadId);

      const errorMessage = formatError(error);

      if (isConnectionFailure(errorMessage)) {
        dispatch({
          type: chatActionTypes.SET_BACKEND_STATUS,
          payload: { status: "unavailable" }
        });
      }

      dispatch({
        type: chatActionTypes.THREAD_ERROR_RECORDED,
        threadId,
        errorMessage
      });
    }
  }

  const isEmptyState = activeThread?.messages.length === 0;

  return (
    <div className={`app-shell ${state.isSidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <Sidebar
        threads={state.threads}
        activeThreadId={state.activeThreadId}
        isCollapsed={state.isSidebarCollapsed}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
      />

      <main className="chat-shell">
        <ChatHeader
          title={isEmptyState ? "Launch Sense" : activeThread.title}
          backendStatus={state.backendStatus.status}
          threadStatus={getThreadStatus(activeThread)}
          onToggleSidebar={() => dispatch({ type: chatActionTypes.TOGGLE_SIDEBAR })}
        />

        <section className="chat-panel">
          {isEmptyState ? (
            <WelcomePanel
              items={suggestedPrompts}
              onSelectPrompt={handleSendMessage}
              backendStatus={state.backendStatus.status}
            />
          ) : (
            <MessageList
              messages={activeThread.messages}
              isBusy={activeThread.busy}
              canStartGeneration={canStartGeneration(activeThread)}
              onStartGeneration={() => startGeneration(activeThread.id)}
              onConfirmValidation={handleConfirmValidation}
              onSelectAlternative={handleSelectAlternative}
            />
          )}
        </section>

        <Composer
          onSend={handleSendMessage}
          disabled={isComposerDisabled(activeThread)}
          placeholder={getComposerPlaceholder(activeThread)}
        />
      </main>
    </div>
  );
}
