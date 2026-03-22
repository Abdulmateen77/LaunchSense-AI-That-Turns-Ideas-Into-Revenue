export function WelcomePanel({ items, onSelectPrompt, backendStatus }) {
  const helperCopy =
    backendStatus === "unavailable"
      ? "The backend is currently unavailable. Once it is reachable again, start with a short description of your business and the new offer you want to launch."
      : "Describe your business, current customers, and your new product or service idea. LaunchSense will ask a few quick questions, then generate a full launch package in under 90 seconds.";

  return (
    <div className="welcome-panel">
      <div className="welcome-panel__content">
        <p className="welcome-panel__eyebrow">Chat-first launch builder</p>
        <h1>What are you launching next?</h1>
        <p className="welcome-panel__copy">{helperCopy}</p>

        <p className="welcome-panel__try">Try one of these to get started ↓</p>

        <div className="welcome-grid">
          {items.map((item) => (
            <button
              type="button"
              key={item.title}
              className="welcome-card"
              onClick={() => onSelectPrompt(item.label)}
            >
              <span className="welcome-card__title">{item.title}</span>
              <span className="welcome-card__label">{item.label}</span>
              <span className="welcome-card__cta">Use this prompt →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
