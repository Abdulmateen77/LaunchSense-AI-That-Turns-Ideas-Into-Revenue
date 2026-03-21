export function WelcomePanel({ items, onSelectPrompt }) {
  return (
    <div className="welcome-panel">
      <div className="welcome-panel__content">
        <p className="welcome-panel__eyebrow">Frontend-only clone</p>
        <h1>How can I help you today?</h1>
        <p className="welcome-panel__copy">
          This version mirrors the Vercel chatbot layout with local-only state and no backend wiring.
        </p>

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
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
