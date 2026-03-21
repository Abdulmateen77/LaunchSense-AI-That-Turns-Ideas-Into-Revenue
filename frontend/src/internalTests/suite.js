import { parseJsonResponse } from "../lib/api.js";
import {
  chatActionTypes,
  chatReducer,
  createInitialAppState,
  getThreadStatus,
  sanitizeIntakeReply,
  selectActiveThread
} from "../lib/chatState.js";
import { normalizeIntakeResponse, THREAD_MODES } from "../lib/contracts.js";
import { consumeFrames } from "../lib/sse.js";
import {
  mockFetchStoredPackage,
  mockGetHealth,
  mockSendIntakeMessage,
  mockStreamGeneration
} from "../mocks/mockBackend.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createJsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function runHappyPathFlow() {
  let state = createInitialAppState({ isSidebarCollapsed: false });
  const threadId = selectActiveThread(state).id;

  state = chatReducer(state, {
    type: chatActionTypes.INTAKE_REQUEST_STARTED,
    threadId,
    message: "I run an HR consultancy and want to launch an AI onboarding audit service."
  });

  const intake = await mockSendIntakeMessage(
    { message: "I run an HR consultancy and want to launch an AI onboarding audit service." },
    { scenario: "two_turn_context" }
  );

  state = chatReducer(state, {
    type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
    threadId,
    response: intake
  });

  const intakeFollowUp = await mockSendIntakeMessage(
    { session_id: intake.session_id, message: "We sell to scaling teams that still run onboarding manually." },
    { scenario: "two_turn_context" }
  );

  state = chatReducer(state, {
    type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
    threadId,
    response: intakeFollowUp
  });

  state = chatReducer(state, {
    type: chatActionTypes.GENERATION_STARTED,
    threadId
  });

  await mockStreamGeneration(
    {
      idea: intakeFollowUp.context.idea,
      context: intakeFollowUp.context
    },
    {
      scenario: "happy_path",
      onEvent: async (eventName, data) => {
        state = chatReducer(state, {
          type: chatActionTypes.GENERATION_EVENT_RECEIVED,
          threadId,
          eventName,
          data:
            eventName === "page"
              ? {
                  ...data,
                  absoluteUrl: `http://localhost:8000${data.url}`
                }
              : data,
          absoluteUrl: data?.slug ? `http://localhost:8000/p/${data.slug}` : null
        });
      }
    }
  );

  const storedPackage = await mockFetchStoredPackage("ai-onboarding-audit-service");
  state = chatReducer(state, {
    type: chatActionTypes.STORED_PACKAGE_RECEIVED,
    threadId,
    storedPackage
  });

  const activeThread = selectActiveThread(state);
  assert(activeThread.phase === THREAD_MODES.COMPLETE, "Happy path should finish in complete state.");
  assert(Boolean(activeThread.results.offer), "Happy path should populate the offer.");
  assert(Boolean(activeThread.results.growth), "Happy path should populate growth assets.");
  assert(Boolean(activeThread.results.storedPackage), "Happy path should store package retrieval data.");
}

async function runPartialFailureFlow() {
  let state = createInitialAppState({ isSidebarCollapsed: false });
  const threadId = selectActiveThread(state).id;

  state = chatReducer(state, {
    type: chatActionTypes.GENERATION_STARTED,
    threadId
  });

  await mockStreamGeneration(
    { idea: "AI onboarding audit service" },
    {
      scenario: "partial_asset_failure",
      onEvent: async (eventName, data) => {
        state = chatReducer(state, {
          type: chatActionTypes.GENERATION_EVENT_RECEIVED,
          threadId,
          eventName,
          data:
            eventName === "page"
              ? {
                  ...data,
                  absoluteUrl: `http://localhost:8000${data.url}`
                }
              : data
        });
      }
    }
  );

  const activeThread = selectActiveThread(state);
  assert(activeThread.phase === THREAD_MODES.ERROR, "Partial failure should end in error state.");
  assert(Boolean(activeThread.results.page), "Partial failure should preserve page data.");
}

export const internalTestCases = [
  {
    id: "api-json-success",
    title: "parseJsonResponse handles successful JSON payloads",
    category: "unit",
    run: async () => {
      const result = await parseJsonResponse(createJsonResponse({ status: "ok" }));
      assert(result.status === "ok", "Expected JSON payload to be parsed.");
    }
  },
  {
    id: "api-json-error",
    title: "parseJsonResponse surfaces server error detail",
    category: "unit",
    run: async () => {
      let threw = false;

      try {
        await parseJsonResponse(
          createJsonResponse(
            {
              detail: "Backend failed."
            },
            { status: 500 }
          )
        );
      } catch (error) {
        threw = error.message === "Backend failed.";
      }

      assert(threw, "Expected parseJsonResponse to throw the backend detail.");
    }
  },
  {
    id: "sse-split-frames",
    title: "SSE parsing handles chunk-split frames",
    category: "unit",
    run: async () => {
      const seen = [];
      let buffer = await consumeFrames(
        'data: {"event":"status","data":{"label":"One"}}\n\n' + 'data: {"event":"status","data":{"label":"Two',
        async (frame) => {
          seen.push(frame.data.label);
        }
      );

      await consumeFrames(`${buffer}"}}\n\n`, async (frame) => {
        seen.push(frame.data.label);
      });

      assert(seen.join(",") === "One,Two", "Expected both SSE frames to parse in order.");
    }
  },
  {
    id: "sanitize-intake",
    title: "sanitizeIntakeReply hides raw CONTEXT_COMPLETE markers",
    category: "unit",
    run: async () => {
      const result = sanitizeIntakeReply("CONTEXT_COMPLETE\n{}", true);
      assert(result === "I have enough context to build your launch package.", "Expected sanitized intake text.");
    }
  },
  {
    id: "context-ready-transition",
    title: "Reducer moves a thread into context_ready after completed intake",
    category: "state",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const threadId = selectActiveThread(state).id;

      state = chatReducer(state, {
        type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
        threadId,
        response: {
          session_id: "mock-1",
          reply: "CONTEXT_COMPLETE",
          complete: true,
          context: {
            idea: "AI onboarding audit service",
            niche: "HR consulting firms",
            target_customer: "HR consultancy owners",
            core_pain: "Manual audits take too much senior time",
            existing_solutions: "Spreadsheets",
            notes: ""
          }
        }
      });

      assert(selectActiveThread(state).phase === THREAD_MODES.CONTEXT_READY, "Expected context_ready phase.");
    }
  },
  {
    id: "queued-context-note",
    title: "Reducer preserves local context correction notes",
    category: "state",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const threadId = selectActiveThread(state).id;

      state = chatReducer(state, {
        type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
        threadId,
        response: {
          session_id: "mock-1",
          reply: "CONTEXT_COMPLETE",
          complete: true,
          context: {
            idea: "AI onboarding audit service",
            niche: "HR consulting firms",
            target_customer: "HR consultancy owners",
            core_pain: "Manual audits take too much senior time",
            existing_solutions: "Spreadsheets",
            notes: ""
          }
        }
      });

      state = chatReducer(state, {
        type: chatActionTypes.LOCAL_THREAD_NOTE_ADDED,
        threadId,
        message: "Please focus on boutique HR firms first.",
        requestKind: "context"
      });

      const activeThread = selectActiveThread(state);
      assert(activeThread.pendingRequests.context.length === 1, "Expected one queued context note.");
      assert(activeThread.messages[activeThread.messages.length - 1].kind === "context", "Expected the context card to reappear after a correction.");
      assert(activeThread.context.notes.includes("Correction request"), "Expected the correction to be reflected in context notes.");
    }
  },
  {
    id: "status-deduplication",
    title: "Reducer does not duplicate identical status messages",
    category: "state",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const threadId = selectActiveThread(state).id;
      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_STARTED,
        threadId
      });

      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_EVENT_RECEIVED,
        threadId,
        eventName: "status",
        data: { step: 0, label: "Researching your market..." }
      });

      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_EVENT_RECEIVED,
        threadId,
        eventName: "status",
        data: { step: 0, label: "Researching your market..." }
      });

      const count = selectActiveThread(state).messages.filter((message) => message.kind === "status").length;
      assert(count === 1, "Expected duplicate status events to collapse into one visible message.");
    }
  },
  {
    id: "reset-on-rerun",
    title: "Reducer resets generation results before a fresh rerun",
    category: "state",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const threadId = selectActiveThread(state).id;

      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_EVENT_RECEIVED,
        threadId,
        eventName: "page",
        data: { slug: "slug", url: "/p/slug", absoluteUrl: "http://localhost:8000/p/slug" }
      });

      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_STARTED,
        threadId
      });

      const activeThread = selectActiveThread(state);
      assert(activeThread.results.page === null, "Expected rerun to clear page results.");
      assert(activeThread.results.critique === "", "Expected rerun to clear critique buffer.");
    }
  },
  {
    id: "mock-intake-two-turn",
    title: "Mock intake completes deterministically after two turns",
    category: "integration",
    run: async () => {
      const first = await mockSendIntakeMessage({ message: "AI onboarding audit service" }, { scenario: "two_turn_context" });
      const second = await mockSendIntakeMessage(
        { session_id: first.session_id, message: "For HR consultancies serving scaling teams" },
        { scenario: "two_turn_context" }
      );

      assert(first.complete === false, "Expected first turn to remain incomplete.");
      assert(second.complete === true, "Expected second turn to complete the context.");
    }
  },
  {
    id: "malformed-intake-response",
    title: "Malformed completed intake responses are rejected by the frontend contract",
    category: "integration",
    run: async () => {
      let threw = false;

      try {
        normalizeIntakeResponse(await mockSendIntakeMessage({ message: "broken" }, { scenario: "malformed_intake" }));
      } catch {
        threw = true;
      }

      assert(threw, "Expected malformed intake payloads to be rejected.");
    }
  },
  {
    id: "mock-generation-research-retry",
    title: "Mock generation can emit the research retry path",
    category: "integration",
    run: async () => {
      const events = [];
      await mockStreamGeneration(
        { idea: "AI onboarding audit service" },
        {
          scenario: "research_retry",
          onEvent: async (eventName) => {
            events.push(eventName);
          }
        }
      );

      assert(events.filter((eventName) => eventName === "status").length >= 2, "Expected multiple status events in retry path.");
    }
  },
  {
    id: "mock-generation-empty-stream",
    title: "Mock generation surfaces empty-stream failures",
    category: "integration",
    run: async () => {
      let threw = false;

      try {
        await mockStreamGeneration({ idea: "AI onboarding audit service" }, { scenario: "empty_stream" });
      } catch (error) {
        threw = error.message.includes("without emitting any events");
      }

      assert(threw, "Expected empty stream scenario to throw.");
    }
  },
  {
    id: "unavailable-health",
    title: "Mock health can represent backend unavailability",
    category: "integration",
    run: async () => {
      let threw = false;

      try {
        await mockGetHealth({ scenario: "health_failure" });
      } catch (error) {
        threw = error.message.includes("unavailable");
      }

      assert(threw, "Expected health failure scenario to throw.");
    }
  },
  {
    id: "intake-failure",
    title: "Mock intake failure is surfaced cleanly",
    category: "integration",
    run: async () => {
      let threw = false;

      try {
        await mockSendIntakeMessage({ message: "Hello" }, { scenario: "intake_failure" });
      } catch (error) {
        threw = error.message.includes("intake request failed");
      }

      assert(threw, "Expected intake failure scenario to throw.");
    }
  },
  {
    id: "generate-start-failure",
    title: "Mock generation can fail before the stream begins",
    category: "integration",
    run: async () => {
      let threw = false;

      try {
        await mockStreamGeneration({ idea: "AI onboarding audit service" }, { scenario: "generate_start_failure" });
      } catch (error) {
        threw = error.message.includes("failed to start");
      }

      assert(threw, "Expected generate-start failure scenario to throw.");
    }
  },
  {
    id: "stored-package-failure",
    title: "Stored package enrichment failure leaves streamed results intact",
    category: "integration",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const threadId = selectActiveThread(state).id;

      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_STARTED,
        threadId
      });

      await mockStreamGeneration(
        { idea: "AI onboarding audit service" },
        {
          scenario: "happy_path",
          onEvent: async (eventName, data) => {
            state = chatReducer(state, {
              type: chatActionTypes.GENERATION_EVENT_RECEIVED,
              threadId,
              eventName,
              data:
                eventName === "page"
                  ? {
                      ...data,
                      absoluteUrl: `http://localhost:8000${data.url}`
                    }
                  : data
            });
          }
        }
      );

      let failed = false;

      try {
        await mockFetchStoredPackage("ai-onboarding-audit-service", { scenario: "stored_package_failure" });
      } catch {
        failed = true;
      }

      const activeThread = selectActiveThread(state);
      assert(failed, "Expected stored package enrichment to fail.");
      assert(Boolean(activeThread.results.growth), "Expected streamed growth results to remain available.");
      assert(activeThread.results.storedPackage === null, "Expected stored package enrichment to remain optional.");
    }
  },
  {
    id: "happy-path-flow",
    title: "Happy path flow completes end to end without a real backend",
    category: "flow",
    run: runHappyPathFlow
  },
  {
    id: "partial-failure-flow",
    title: "Partial asset failures preserve successful output",
    category: "flow",
    run: runPartialFailureFlow
  },
  {
    id: "thread-status-selector",
    title: "Thread status selector distinguishes welcome, running, and error states",
    category: "state",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const welcome = getThreadStatus(selectActiveThread(state));
      const threadId = selectActiveThread(state).id;

      state = chatReducer(state, {
        type: chatActionTypes.GENERATION_STARTED,
        threadId
      });
      const generating = getThreadStatus(selectActiveThread(state));

      state = chatReducer(state, {
        type: chatActionTypes.THREAD_ERROR_RECORDED,
        threadId,
        errorMessage: "Boom"
      });
      const errored = getThreadStatus(selectActiveThread(state));

      assert(welcome.label === "Waiting for brief", "Expected welcome label.");
      assert(generating.label === "Generation running", "Expected generating label.");
      assert(errored.label === "Needs attention", "Expected error label.");
    }
  },
  {
    id: "new-chat-isolation",
    title: "Creating a new chat does not leak the previous thread state",
    category: "state",
    run: async () => {
      let state = createInitialAppState({ isSidebarCollapsed: false });
      const firstThreadId = selectActiveThread(state).id;

      state = chatReducer(state, {
        type: chatActionTypes.INTAKE_RESPONSE_RECEIVED,
        threadId: firstThreadId,
        response: {
          session_id: "mock-1",
          reply: "CONTEXT_COMPLETE",
          complete: true,
          context: {
            idea: "AI onboarding audit service",
            niche: "HR consulting firms",
            target_customer: "HR consultancy owners",
            core_pain: "Manual audits take too much senior time",
            existing_solutions: "Spreadsheets",
            notes: ""
          }
        }
      });

      state = chatReducer(state, {
        type: chatActionTypes.CREATE_NEW_CHAT
      });

      const activeThread = selectActiveThread(state);
      assert(activeThread.id !== firstThreadId, "Expected a distinct new thread.");
      assert(activeThread.messages.length === 0, "Expected the new thread to start empty.");
      assert(activeThread.context === null, "Expected the new thread to start without context.");
    }
  }
];

export async function runInternalTestSuite() {
  const results = [];

  for (const testCase of internalTestCases) {
    const startedAt = performance.now();

    try {
      await testCase.run();

      results.push({
        ...testCase,
        status: "passed",
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100
      });
    } catch (error) {
      results.push({
        ...testCase,
        status: "failed",
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}
