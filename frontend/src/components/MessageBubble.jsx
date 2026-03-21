export function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <article className={`message-row ${isUser ? "message-row--user" : ""}`}>
      <div className={`message-avatar ${isUser ? "message-avatar--user" : "message-avatar--assistant"}`}>
        {isUser ? "U" : "AI"}
      </div>

      <div className={`message-card ${isUser ? "message-card--user" : "message-card--assistant"}`}>
        <p className="message-card__text">{message.text}</p>
      </div>
    </article>
  );
}
