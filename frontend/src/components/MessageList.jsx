import { useLayoutEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";

export function MessageList({ messages, isBusy, canStartGeneration, onStartGeneration }) {
  const listRef = useRef(null);

  useLayoutEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [messages, isBusy]);

  return (
    <div ref={listRef} className="message-list" aria-live="polite">
      <div className="message-column">
        <div className="message-stack">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              canStartGeneration={canStartGeneration}
              onStartGeneration={onStartGeneration}
            />
          ))}

          {isBusy ? (
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
