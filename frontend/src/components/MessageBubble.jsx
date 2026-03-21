// frontend/src/components/MessageBubble.jsx
// ADD this import at the top
import LandingPageCard from "./LandingPageCard";

// REPLACE renderAssetsCard with this:
function renderAssetsCard(message, storedPackage) {
  const page = message.data?.page;
  const growth = message.data?.growth;

  // Full landing_page object arrives via storedPackage after COMPLETE event
  const landingPage = storedPackage?.landing_page;
  const slug = page?.slug || storedPackage?.slug;

  return (
    <div className="structured-card">
      <p className="message-card__eyebrow">Assets</p>

      {/* Landing page preview — renders when storedPackage arrives */}
      {landingPage && slug ? (
        <section className="structured-section">
          <h3>Landing Page</h3>
          <div style={{ marginTop: 12 }}>
            <LandingPageCard page={landingPage} slug={slug} />
          </div>
        </section>
      ) : page ? (
        // Fallback while storedPackage is loading — show slug + link
        <section className="structured-section">
          <h3>Landing Page</h3>
          <DataRow label="Slug" value={page.slug} />
          <LinkRow label="URL" href={page.absoluteUrl || page.url} />
        </section>
      ) : null}

      {growth?.channel ? (
        <section className="structured-section">
          <h3>Channel Recommendation</h3>
          <DataRow label="Pick" value={growth.channel.pick} />
          <DataRow label="Why" value={growth.channel.why} multiline />
          <DataRow label="Action" value={growth.channel.action} multiline />
        </section>
      ) : null}

      {growth?.cold_email ? (
        <section className="structured-section">
          <h3>Cold Email</h3>
          <DataRow label="Subject" value={growth.cold_email.subject} multiline />
          <DataRow label="Body" value={growth.cold_email.body} multiline />
          <DataRow label="Evidence line" value={growth.cold_email.evidence_line} multiline />
          <LinkRow label="Evidence URL" href={growth.cold_email.evidence_url} />
          <DataRow label="PS" value={growth.cold_email.ps} multiline />
        </section>
      ) : null}

      {growth?.linkedin_dm ? (
        <section className="structured-section">
          <h3>LinkedIn DM</h3>
          <p className="message-card__pre">{growth.linkedin_dm}</p>
        </section>
      ) : null}

      {Array.isArray(growth?.hooks) && growth.hooks.length ? (
        <section className="structured-section">
          <h3>Hooks</h3>
          <ul className="structured-list">
            {growth.hooks.map((hook) => (
              <li key={`${hook.platform}-${hook.hook}`}>
                <strong>{hook.platform}</strong>
                <span>{hook.hook}</span>
                <span>{hook.angle}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// REPLACE renderMessageContent to pass storedPackage through:
function renderMessageContent(message, canStartGeneration, onStartGeneration, storedPackage) {
  switch (message.kind) {
    case "context":
      return renderContextCard(message);
    case "research":
      return renderResearchCard(message);
    case "offer":
      return renderOfferCard(message);
    case "assets":
      return renderAssetsCard(message, storedPackage);  // ← pass storedPackage
    case "validation":
      return null;
    case "status":
      return (
        <>
          <p className="message-card__eyebrow">Status</p>
          <p className="message-card__text">{message.text}</p>
        </>
      );
    case "critique":
      return (
        <>
          <p className="message-card__eyebrow">Critique</p>
          <p className="message-card__text">{message.text}</p>
        </>
      );
    case "error":
      return (
        <>
          <p className="message-card__eyebrow">Error</p>
          <p className="message-card__text">{message.text}</p>
        </>
      );
    default:
      return <p className="message-card__text">{message.text}</p>;
  }
}

// REPLACE MessageBubble to accept and pass storedPackage:
export function MessageBubble({ message, canStartGeneration, onStartGeneration, storedPackage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const avatarLabel = isUser ? "U" : isSystem ? "SYS" : "AI";

  if (message.kind === "validation") return null;

  return (
    <article className={`message-row ${isUser ? "message-row--user" : ""}`}>
      <div className={`message-avatar ${
        isUser ? "message-avatar--user"
        : isSystem ? "message-avatar--system"
        : "message-avatar--assistant"
      }`}>
        {avatarLabel}
      </div>
      <div className={`message-card ${
        isUser ? "message-card--user"
        : message.kind === "error" ? "message-card--error"
        : message.kind === "status" ? "message-card--status"
        : "message-card--assistant"
      }`}>
        {renderMessageContent(message, canStartGeneration, onStartGeneration, storedPackage)}
      </div>
    </article>
  );
}