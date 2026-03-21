function PanelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v12.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25V5.75ZM9.5 4v16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ChatHeader({ title, onToggleSidebar }) {
  return (
    <header className="chat-header">
      <button type="button" className="chat-header__toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <PanelIcon />
      </button>

      <div className="chat-header__title-group">
        <span className="chat-header__title">{title}</span>
      </div>
    </header>
  );
}
