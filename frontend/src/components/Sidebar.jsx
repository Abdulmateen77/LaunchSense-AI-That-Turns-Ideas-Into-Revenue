function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.75 14.36 9.64 20.25 12l-5.89 2.36L12 20.25l-2.36-5.89L3.75 12l5.89-2.36L12 3.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </span>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="14" height="14">
      <path d="M9 3h6M3 6h18M8 6l1 13h6l1-13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width="15" height="15">
      <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10M17 16l4-4-4-4M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar({ threads, activeThreadId, isCollapsed, onSelectThread, onNewChat, onDeleteThread, onLogout, onClose }) {
  return (
    <>
      {!isCollapsed ? (
        <div className="sidebar-backdrop" aria-hidden="true" onClick={onClose} />
      ) : null}

      <aside className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar__brand">
          <LogoMark />
          {!isCollapsed ? <span className="sidebar__brand-label">Launch Sense</span> : null}
        </div>

        <button type="button" className="sidebar__new-chat" onClick={onNewChat}>
          <NewChatIcon />
          {!isCollapsed ? <span>New chat</span> : null}
        </button>

        {!isCollapsed ? <p className="sidebar__section-label">Recent chats</p> : null}

        <nav className="thread-list" aria-label="Conversation list">
          {threads.map((thread) => {
            const isActive = thread.id === activeThreadId;

            return (
              <div
                key={thread.id}
                className={`thread-card ${isActive ? "thread-card--active" : ""}`}
              >
                <button
                  type="button"
                  className="thread-card__body"
                  onClick={() => onSelectThread(thread.id)}
                  aria-label={thread.title}
                >
                  {isCollapsed ? (
                    <span className="thread-card__glyph">{thread.title.slice(0, 2).toUpperCase()}</span>
                  ) : (
                    <>
                      <span className="thread-card__title">{thread.title}</span>
                      <span className="thread-card__preview">
                        {thread.preview || "Start a new conversation"}
                      </span>
                    </>
                  )}
                </button>

                {!isCollapsed ? (
                  <button
                    type="button"
                    className="thread-card__delete"
                    onClick={(e) => { e.stopPropagation(); onDeleteThread(thread.id); }}
                    aria-label={`Delete ${thread.title}`}
                    title="Delete chat"
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          {!isCollapsed ? (
            <button type="button" className="sidebar__logout" onClick={onLogout}>
              <LogoutIcon />
              <span>Log out</span>
            </button>
          ) : (
            <button type="button" className="sidebar__logout sidebar__logout--icon" onClick={onLogout} aria-label="Log out">
              <LogoutIcon />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
