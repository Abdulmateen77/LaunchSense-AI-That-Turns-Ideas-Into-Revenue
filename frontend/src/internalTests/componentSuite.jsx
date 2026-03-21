import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatHeader } from "../components/ChatHeader.jsx";
import { Composer } from "../components/Composer.jsx";
import { MessageBubble } from "../components/MessageBubble.jsx";
import { WelcomePanel } from "../components/WelcomePanel.jsx";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browserOnlyTestCases = [
  {
    id: "component-welcome-panel-unavailable",
    title: "WelcomePanel renders unavailable-backend guidance",
    category: "component",
    run: async () => {
      const markup = renderToStaticMarkup(
        <WelcomePanel items={[]} onSelectPrompt={() => {}} backendStatus="unavailable" />
      );

      assert(markup.includes("backend is currently unavailable"), "Expected unavailable helper copy in WelcomePanel.");
    }
  },
  {
    id: "component-message-bubble-context",
    title: "MessageBubble renders the context-ready generate action",
    category: "component",
    run: async () => {
      const markup = renderToStaticMarkup(
        <MessageBubble
          message={{
            id: "context-1",
            role: "assistant",
            kind: "context",
            data: {
              context: {
                idea: "AI onboarding audit service",
                niche: "HR consulting firms",
                target_customer: "HR consultancy owners",
                core_pain: "Manual audits take too much senior time",
                existing_solutions: "Spreadsheets",
                notes: ""
              }
            }
          }}
          canStartGeneration
          onStartGeneration={() => {}}
        />
      );

      assert(markup.includes("Generate launch package"), "Expected generate action in context card.");
    }
  },
  {
    id: "component-chat-header-status",
    title: "ChatHeader renders backend and thread status pills",
    category: "component",
    run: async () => {
      const markup = renderToStaticMarkup(
        <ChatHeader
          title="Launch Sense"
          backendStatus="connected"
          threadStatus={{
            label: "Context ready",
            tone: "connected",
            detail: "You can correct the summary in chat."
          }}
          onToggleSidebar={() => {}}
        />
      );

      assert(markup.includes("Backend connected"), "Expected backend status pill.");
      assert(markup.includes("Context ready"), "Expected thread status pill.");
    }
  },
  {
    id: "component-composer-placeholder",
    title: "Composer renders the supplied placeholder and disabled state",
    category: "component",
    run: async () => {
      const markup = renderToStaticMarkup(
        <Composer onSend={async () => true} disabled placeholder="Type a refinement request..." />
      );

      assert(markup.includes("Type a refinement request..."), "Expected composer placeholder.");
      assert(markup.includes("disabled"), "Expected disabled composer controls in markup.");
    }
  }
];

export async function runBrowserOnlyTestSuite() {
  const results = [];

  for (const testCase of browserOnlyTestCases) {
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
