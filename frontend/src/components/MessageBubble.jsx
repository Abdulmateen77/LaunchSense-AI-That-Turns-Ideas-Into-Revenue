function DataRow({ label, value, multiline = false }) {
  if (!value) {
    return null;
  }

  return (
    <div className="data-row">
      <span className="data-row__label">{label}</span>
      <span className={`data-row__value ${multiline ? "data-row__value--multiline" : ""}`}>{value}</span>
    </div>
  );
}

function LinkRow({ label, href }) {
  if (!href) {
    return null;
  }

  return (
    <div className="data-row">
      <span className="data-row__label">{label}</span>
      <a className="message-link" href={href} target="_blank" rel="noreferrer">
        {href}
      </a>
    </div>
  );
}

function renderContextCard(message) {
  const context = message.data?.context;

  if (!context) {
    return null;
  }

  return (
    <div className="structured-card">
      <p className="message-card__eyebrow">Context captured — analysing your idea...</p>
      <DataRow label="Idea" value={context.idea} multiline />
      <DataRow label="Niche" value={context.niche} multiline />
      <DataRow label="Target customer" value={context.target_customer} multiline />
      <DataRow label="Core pain" value={context.core_pain} multiline />
      <DataRow label="Existing solutions" value={context.existing_solutions} multiline />
      <DataRow label="Notes" value={context.notes} multiline />
    </div>
  );
}

function renderResearchCard(message) {
  const data = message.data;
  const competitors = Array.isArray(data?.competitors) ? data.competitors : [];
  const quotes = Array.isArray(data?.reddit_quotes) ? data.reddit_quotes : [];
  const signals = Array.isArray(data?.market_signals) ? data.market_signals : [];
  const pricingRange = data?.pricing_range;

  return (
    <div className="structured-card">
      <p className="message-card__eyebrow">Research</p>

      <section className="structured-section">
        <h3>Competitors</h3>
        {competitors.length ? (
          <ul className="structured-list">
            {competitors.map((competitor) => (
              <li key={`${competitor.name}-${competitor.url}`}>
                <strong>{competitor.name}</strong>
                <span>{competitor.pricing_found}</span>
                <span>{competitor.weakness}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="structured-empty">No competitors returned.</p>
        )}
      </section>

      <section className="structured-section">
        <h3>Customer Quotes</h3>
        {quotes.length ? (
          <ul className="structured-list">
            {quotes.map((quote) => (
              <li key={`${quote.thread_url}-${quote.subreddit}`}>
                <strong>r/{quote.subreddit}</strong>
                <span>{quote.quote}</span>
                <span>{quote.upvotes} upvotes</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="structured-empty">No Reddit quotes returned.</p>
        )}
      </section>

      <section className="structured-section">
        <h3>Market Signals</h3>
        {signals.length ? (
          <ul className="structured-list">
            {signals.map((signal) => (
              <li key={`${signal.signal}-${signal.source}`}>
                <span>{signal.signal}</span>
                <span>{signal.source}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="structured-empty">No market signals returned.</p>
        )}
      </section>

      {pricingRange ? (
        <section className="structured-section">
          <h3>Pricing Range</h3>
          <DataRow label="Low" value={pricingRange.low} />
          <DataRow label="High" value={pricingRange.high} />
          <DataRow label="Insight" value={pricingRange.insight} multiline />
        </section>
      ) : null}
    </div>
  );
}

function renderOfferCard(message) {
  const offer = message.data?.offer;
  const evaluation = message.data?.eval;

  if (!offer) {
    return null;
  }

  return (
    <div className="structured-card">
      <p className="message-card__eyebrow">Offer</p>

      {evaluation ? (
        <section className="structured-section">
          <h3>Eval</h3>
          <DataRow label="Research score" value={evaluation.research?.score?.toString()} />
          <DataRow label="Research action" value={evaluation.research?.action} />
          <DataRow label="Offer score" value={evaluation.offer?.score?.toString()} />
          <DataRow label="Offer action" value={evaluation.offer?.action} />
        </section>
      ) : null}

      <section className="structured-section">
        <h3>ICP</h3>
        <DataRow label="Who" value={offer.icp?.who} multiline />
        <DataRow label="Pain" value={offer.icp?.pain} multiline />
        <DataRow label="Trigger" value={offer.icp?.trigger} multiline />
        <DataRow label="Evidence" value={offer.icp?.evidence_source} multiline />
      </section>

      <section className="structured-section">
        <h3>Positioning</h3>
        <DataRow label="Headline" value={offer.headline} multiline />
        <DataRow label="Subheadline" value={offer.subheadline} multiline />
        <DataRow label="Outcome" value={offer.outcome} multiline />
        <DataRow label="Price" value={offer.price} />
        <DataRow label="Price anchor" value={offer.price_anchor} multiline />
        <DataRow label="Guarantee" value={offer.guarantee} multiline />
        <DataRow label="Urgency" value={offer.urgency} multiline />
        <DataRow label="CTA" value={offer.cta} multiline />
        <DataRow label="Competitor gap" value={offer.competitor_gap} multiline />
      </section>

      {Array.isArray(offer.bonuses) && offer.bonuses.length ? (
        <section className="structured-section">
          <h3>Bonuses</h3>
          <ul className="structured-list">
            {offer.bonuses.map((bonus) => (
              <li key={bonus}>
                <span>{bonus}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function renderAssetsCard(message) {
  const page = message.data?.page;
  const growth = message.data?.growth;

  return (
    <div className="structured-card">
      <p className="message-card__eyebrow">Assets</p>

      {page ? (
        <section className="structured-section">
          <h3>Landing Page</h3>
          <DataRow label="Slug" value={page.slug} />
          <LinkRow label="Stored package URL" href={page.absoluteUrl || page.url} />
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

function renderMessageContent(message, canStartGeneration, onStartGeneration) {
  switch (message.kind) {
    case "context":
      return renderContextCard(message);
    case "research":
      return renderResearchCard(message);
    case "offer":
      return renderOfferCard(message);
    case "assets":
      return renderAssetsCard(message);
    case "validation":
      // ValidationCard is rendered directly in MessageList with callbacks — skip here
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

export function MessageBubble({ message, canStartGeneration, onStartGeneration }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const avatarLabel = isUser ? "U" : isSystem ? "SYS" : "AI";

  return (
    <article className={`message-row ${isUser ? "message-row--user" : ""}`}>
      <div
        className={`message-avatar ${
          isUser
            ? "message-avatar--user"
            : isSystem
              ? "message-avatar--system"
              : "message-avatar--assistant"
        }`}
      >
        {avatarLabel}
      </div>

      <div
        className={`message-card ${
          isUser
            ? "message-card--user"
            : message.kind === "error"
              ? "message-card--error"
              : message.kind === "status"
                ? "message-card--status"
                : "message-card--assistant"
        }`}
      >
        {renderMessageContent(message, canStartGeneration, onStartGeneration)}
      </div>
    </article>
  );
}
