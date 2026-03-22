import { useLayoutEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ValidationCard } from "./ValidationCard";
import { GenerationProgress } from "./GenerationProgress";
import { THREAD_MODES } from "../lib/contracts";

export function MessageList({
  messages,
  isBusy,
  phase,
  stage,
  canStartGeneration,
  onStartGeneration,
  onConfirmValidation,
  onSelectAlternative
}) {
  const listRef = useRef(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, isBusy]);

  return (
    <div ref={listRef} className="message-list" aria-live="polite">
      <div className="message-column">
        <div className="message-stack">
          {messages.map((message) => {
            if (message.kind === "validation") {
              return (
                <div key={message.id} className="message-row">
                  <div className="message-avatar message-avatar--assistant">AI</div>
                  <div className="message-card" style={{ maxWidth: "calc(100% - 3rem)", width: "100%" }}>
                    <ValidationCard
                      data={message.data}
                      disabled={isBusy}
                      onConfirm={onConfirmValidation}
                      onSelectAlternative={onSelectAlternative}
                    />
                  </div>
                </div>
              );
            }

            return (
              <MessageBubble
                key={message.id}
                message={message}
                canStartGeneration={canStartGeneration}
                onStartGeneration={onStartGeneration}
              />
            );
          })}

          {phase === THREAD_MODES.GENERATING ? (
            <div className="message-row">
              <div className="message-avatar message-avatar--assistant">AI</div>
              <div className="message-card message-card--assistant" style={{ maxWidth: "calc(100% - 3rem)", width: "100%" }}>
                <GenerationProgress stage={stage} />
              </div>
            </div>
          ) : isBusy ? (
            <div className="message-row">
              <div className="message-avatar message-avatar--assistant">AI</div>
              <div className="typing-card" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
