import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatHeader } from "./components/ChatHeader";
import { MessageList } from "./components/MessageList";
import { Composer } from "./components/Composer";
import { WelcomePanel } from "./components/WelcomePanel";

const suggestedPrompts = [
  {
    title: "Build a product requirements outline",
    label: "Create a clean PRD structure for a team dashboard MVP."
  },
  {
    title: "Explain a React pattern",
    label: "Show me when to use controlled inputs versus uncontrolled ones."
  },
  {
    title: "Draft launch copy",
    label: "Write homepage messaging for an AI note taking app."
  },
  {
    title: "Plan a migration",
    label: "Map a phased migration from REST endpoints to GraphQL."
  }
];

const cannedReplies = [
  "This frontend-only clone keeps the interaction model local, but the component structure is ready to plug into a real chat backend later.",
  "A strong next step would be wiring message persistence and thread loading into the same layout without changing the UI layer.",
  "If you want this even closer to the Vercel template, the next polish pass would be keyboard shortcuts, thread grouping, and a richer empty-state composer.",
  "The main shell now follows the same sidebar, welcome state, and docked composer pattern while staying backend-free."
];

function createMessage(role, text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text
  };
}

function createEmptyThread(index) {
  return {
    id: `thread-${Date.now()}-${index}`,
    title: "New chat",
    preview: "",
    updatedAt: "Just now",
    messages: []
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

const initialThreads = [
  createEmptyThread(1),
  {
    id: "thread-ui-clone",
    title: "Clone the Vercel chatbot UI",
    preview: "Recreate the frontend only, without any backend logic.",
    updatedAt: "Earlier",
    messages: [
      createMessage("user", "Clone the Vercel chatbot UI, but keep it frontend only."),
      createMessage(
        "assistant",
        "I can mirror the layout and interaction patterns with local state, then leave the backend integration for later."
      )
    ]
  },
  {
    id: "thread-react-help",
    title: "React layout question",
    preview: "How would you structure a split-pane workspace in React?",
    updatedAt: "Yesterday",
    messages: [
      createMessage("user", "How would you structure a split-pane workspace in React?"),
      createMessage(
        "assistant",
        "Start with a shell layout component, keep pane state at the top level, and treat navigation and content as separate composable surfaces."
      )
    ]
  }
];

export default function App() {
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id);
  const [isReplying, setIsReplying] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 860 : false
  );
  const replyIndex = useRef(0);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [activeThreadId, threads]
  );

  useEffect(() => {
    if (!isReplying || !activeThread) {
      return undefined;
    }

    const threadId = activeThread.id;
    const timeoutId = window.setTimeout(() => {
      const reply = cannedReplies[replyIndex.current % cannedReplies.length];
      replyIndex.current += 1;

      setThreads((currentThreads) =>
        moveThreadToTop(currentThreads, threadId, (thread) => ({
          ...thread,
          preview: reply,
          updatedAt: "Just now",
          messages: [...thread.messages, createMessage("assistant", reply)]
        }))
      );
      setIsReplying(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [activeThread, isReplying]);

  function handleSelectThread(threadId) {
    setActiveThreadId(threadId);

    if (typeof window !== "undefined" && window.innerWidth < 860) {
      setIsSidebarCollapsed(true);
    }
  }

  function handleSendMessage(value) {
    const trimmed = value.trim();

    if (!trimmed || !activeThread || isReplying) {
      return;
    }

    setThreads((currentThreads) =>
      moveThreadToTop(currentThreads, activeThread.id, (thread) => ({
        ...thread,
        title: thread.messages.length === 0 ? buildTitle(trimmed) : thread.title,
        preview: trimmed,
        updatedAt: "Just now",
        messages: [...thread.messages, createMessage("user", trimmed)]
      }))
    );

    setIsReplying(true);
  }

  function handleNewChat() {
    if (isReplying) {
      return;
    }

    const thread = createEmptyThread(threads.length + 1);
    setThreads((currentThreads) => [thread, ...currentThreads]);
    setActiveThreadId(thread.id);

    if (typeof window !== "undefined" && window.innerWidth < 860) {
      setIsSidebarCollapsed(true);
    }
  }

  const isEmptyState = activeThread.messages.length === 0;

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        isCollapsed={isSidebarCollapsed}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
      />

      <main className="chat-shell">
        <ChatHeader
          title={isEmptyState ? "Launch Sense" : activeThread.title}
          onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
        />

        <section className="chat-panel">
          {isEmptyState ? (
            <WelcomePanel items={suggestedPrompts} onSelectPrompt={handleSendMessage} />
          ) : (
            <MessageList messages={activeThread.messages} isReplying={isReplying} />
          )}
        </section>

        <Composer onSend={handleSendMessage} disabled={isReplying} />
      </main>
    </div>
  );
}
