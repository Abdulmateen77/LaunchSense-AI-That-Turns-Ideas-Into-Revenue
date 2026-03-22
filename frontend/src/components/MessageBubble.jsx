import { useState } from "react";
import { exportPackageAsText, downloadTextFile } from "../lib/exportPackage";

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "copy-btn--copied" : ""}`}
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function CollapsibleSection({ title, children, copyText = null, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="structured-section">
      <div className="structured-section__header">
        <button
          type="button"
          className="collapsible-toggle"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className={`collapsible-toggle__chevron ${open ? "collapsible-toggle__chevron--open" : ""}`}>▸</span>
          <h3>{title}</h3>
        </button>
        {copyText && open ? <CopyButton label="Copy" text={copyText} /> : null}
      </div>
      {open ? <div className="collapsible-body">{children}</div> : null}
    </section>
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="md-hr" />);
      i++;
      continue;
    }

    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h3) { elements.push(<h3 key={i} className="md-h3">{inlineFormat(h3[1])}</h3>); i++; continue; }
    if (h2) { elements.push(<h2 key={i} className="md-h2">{inlineFormat(h2[1])}</h2>); i++; continue; }
    if (h1) { elements.push(<h1 key={i} className="md-h1">{inlineFormat(h1[1])}</h1>); i++; continue; }

    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^[-*]\s/, ""))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="md-ul">{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{inlineFormat(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="md-ol">{items}</ol>);
      continue;
    }

    if (!line.trim()) { i++; continue; }

    elements.push(<p key={i} className="md-p">{inlineFormat(line)}</p>);
    i++;
  }

  return elements;
}

function inlineFormat(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={idx}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function stripLeadingDash(val) {
  if (typeof val !== "string") return val;
  return val.replace(/^[-–—]\s*/, "");
}

function DataRow({ label, value, multiline = false }) {
  if (!value) return null;
  const display = stripLeadingDash(value);
  return (
    <div className="data-row">
      <span className="data-row__label">{label}</span>
      <span className={`data-row__value ${multiline ? "data-row__value--multiline" : ""}`}>{display}</span>
    </div>
  );
}

function LinkRow({ label, href }) {
  if (!href) return null;
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
  if (!context) return null;

  return (
    <div className="structured-card">
      <p className="message-card__eyebrow">Your brief</p>
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
      <p className="message-card__eyebrow">Market research</p>

      <CollapsibleSection title={`Competitors (${competitors.length})`} defaultOpen={true}>
        {competitors.length ? (
          <ul className="structured-list">
            {competitors.map((competitor) => (
              <li key={`${competitor.name}-${competitor.url}`}>
                <strong>{competitor.name}</strong>
                <span>{competitor.pricing_found}</span>
                <span className="text-muted">{competitor.weakness}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="structured-empty">No competitors found.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Customer quotes (${quotes.length})`} defaultOpen={true}>
        {quotes.length ? (
          <ul className="structured-list">
            {quotes.map((quote) => (
              <li key={`${quote.thread_url}-${quote.subreddit}`}>
                <strong>r/{quote.subreddit}</strong>
                <span>"{quote.quote}"</span>
                <span className="text-muted">{quote.upvotes} upvotes</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="structured-empty">No quotes found.</p>
        )}
      </CollapsibleSection>

      {signals.length ? (
        <CollapsibleSection title={`Market signals (${signals.length})`} defaultOpen={false}>
          <ul className="structured-list">
            {signals.map((signal) => (
              <li key={`${signal.signal}-${signal.source}`}>
                <span>{signal.signal}</span>
                <span className="text-muted">{signal.source}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {pricingRange ? (
        <CollapsibleSection title="Pricing range" defaultOpen={false}>
          <DataRow label="Low" value={pricingRange.low} />
          <DataRow label="High" value={pricingRange.high} />
          <DataRow label="Insight" value={pricingRange.insight} multiline />
        </CollapsibleSection>
      ) : null}
    </div>
  );
}

function EditableField({ label, value, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stripLeadingDash(value || ""));

  if (!value && !editing) return null;

  return (
    <div className={`data-row data-row--editable ${editing ? "data-row--editing" : ""}`}>
      <div className="data-row__label-row">
        <span className="data-row__label">{label}</span>
        <button
          type="button"
          className="edit-btn"
          onClick={() => setEditing(e => !e)}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      {editing ? (
        <textarea
          className="edit-textarea"
          value={draft}
          rows={multiline ? 3 : 1}
          onChange={e => setDraft(e.target.value)}
          autoFocus
        />
      ) : (
        <span className={`data-row__value ${multiline ? "data-row__value--multiline" : ""}`}>
          {draft}
        </span>
      )}
    </div>
  );
}

// Estimated values for the value stack — derived from price if possible
const VALUE_MULTIPLIERS = [2.4, 1.6, 1.2, 0.8, 0.4, 0.3];

function parsePrice(priceStr) {
  if (!priceStr) return null;
  const match = priceStr.match(/[\d,]+/);
  return match ? parseInt(match[0].replace(/,/g, ""), 10) : null;
}

function ValueStackItem({ label, value }) {
  return (
    <div className="value-stack__item">
      <span className="value-stack__check">✓</span>
      <span className="value-stack__label">{label}</span>
      <span className="value-stack__value">{value}</span>
    </div>
  );
}

function OfferCard({ message, onStartGeneration }) {
  const offer = message.data?.offer;
  const evaluation = message.data?.eval;

  if (!offer) return null;

  const priceNum = parsePrice(offer.price);

  // Build value stack items from offer fields
  const valueItems = [
    offer.outcome && { label: offer.outcome, mult: VALUE_MULTIPLIERS[0] },
    offer.competitor_gap && { label: offer.competitor_gap, mult: VALUE_MULTIPLIERS[1] },
    offer.guarantee && { label: `Guarantee: ${offer.guarantee}`, mult: VALUE_MULTIPLIERS[2] },
    offer.icp?.trigger && { label: `Trigger support: ${offer.icp.trigger}`, mult: VALUE_MULTIPLIERS[3] },
  ].filter(Boolean);

  const totalValue = priceNum
    ? valueItems.reduce((sum, item) => sum + Math.round(priceNum * item.mult), 0)
    : null;

  function handleRegen() {
    if (window.confirm("Regenerate the full launch package? This takes ~90 seconds and will replace the current results.")) {
      onStartGeneration();
    }
  }

  const copyText = [
    offer.headline,
    "",
    offer.subheadline,
    "",
    `For: ${offer.icp?.who}`,
    `Pain: ${offer.icp?.pain}`,
    "",
    offer.outcome,
    "",
    offer.price_anchor,
    `Investment: ${offer.price}`,
    "",
    `Guarantee: ${offer.guarantee}`,
    "",
    offer.urgency,
    "",
    `→ ${offer.cta}`,
  ].filter(v => v !== undefined).join("\n");

  return (
    <div className="offer-gso">
      {/* Header */}
      <div className="offer-gso__header">
        <span className="offer-gso__eyebrow">Grand Slam Offer</span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <CopyButton text={copyText} label="Copy offer" />
          {onStartGeneration ? (
            <button type="button" className="regen-btn" onClick={handleRegen} title="Re-run the full pipeline">
              ↺ Regenerate
            </button>
          ) : null}
        </div>
      </div>

      {/* Dream Outcome hero */}
      <div className="offer-gso__hero">
        <h2 className="offer-gso__headline">{stripLeadingDash(offer.headline)}</h2>
        <p className="offer-gso__subheadline">{stripLeadingDash(offer.subheadline)}</p>
      </div>

      {/* ICP pill */}
      <div className="offer-gso__icp">
        <span className="offer-gso__icp-label">For</span>
        <span className="offer-gso__icp-who">{stripLeadingDash(offer.icp?.who)}</span>
      </div>

      {/* Pain + trigger */}
      <div className="offer-gso__pain-block">
        <div className="offer-gso__pain-row">
          <span className="offer-gso__pain-icon">⚡</span>
          <div>
            <div className="offer-gso__pain-title">The pain</div>
            <div className="offer-gso__pain-text">{stripLeadingDash(offer.icp?.pain)}</div>
          </div>
        </div>
        {offer.icp?.trigger ? (
          <div className="offer-gso__pain-row">
            <span className="offer-gso__pain-icon">🎯</span>
            <div>
              <div className="offer-gso__pain-title">Buying trigger</div>
              <div className="offer-gso__pain-text">{stripLeadingDash(offer.icp.trigger)}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Value stack */}
      {valueItems.length ? (
        <div className="offer-gso__section">
          <div className="offer-gso__section-label">What you get</div>
          <div className="value-stack">
            {valueItems.map((item, i) => (
              <ValueStackItem
                key={i}
                label={stripLeadingDash(item.label)}
                value={priceNum ? `~${offer.price?.replace(/[\d,]+/, String(Math.round(priceNum * item.mult)))} value` : "included"}
              />
            ))}
            {totalValue && priceNum ? (
              <div className="value-stack__total">
                <span>Total value</span>
                <span>{offer.price?.replace(/[\d,]+/, String(totalValue))}+</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Bonuses */}
      {Array.isArray(offer.bonuses) && offer.bonuses.length ? (
        <div className="offer-gso__section">
          <div className="offer-gso__section-label">Bonuses included</div>
          <div className="offer-gso__bonuses">
            {offer.bonuses.map((bonus, i) => (
              <div key={i} className="offer-gso__bonus-item">
                <span className="offer-gso__bonus-num">0{i + 1}</span>
                <span>{stripLeadingDash(bonus)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Guarantee */}
      {offer.guarantee ? (
        <div className="offer-gso__guarantee">
          <div className="offer-gso__guarantee-badge">🛡</div>
          <div>
            <div className="offer-gso__guarantee-title">The Guarantee</div>
            <div className="offer-gso__guarantee-text">{stripLeadingDash(offer.guarantee)}</div>
          </div>
        </div>
      ) : null}

      {/* Price anchoring */}
      <div className="offer-gso__pricing">
        <div className="offer-gso__anchor">{stripLeadingDash(offer.price_anchor)}</div>
        <div className="offer-gso__price-row">
          <span className="offer-gso__price-label">Your investment</span>
          <span className="offer-gso__price">{offer.price}</span>
        </div>
      </div>

      {/* Urgency */}
      {offer.urgency ? (
        <div className="offer-gso__urgency">
          <span className="offer-gso__urgency-icon">⏳</span>
          {stripLeadingDash(offer.urgency)}
        </div>
      ) : null}

      {/* CTA */}
      <div className="offer-gso__cta-block">
        <div className="offer-gso__cta-text">→ {stripLeadingDash(offer.cta)}</div>
        {offer.competitor_gap ? (
          <div className="offer-gso__gap">{stripLeadingDash(offer.competitor_gap)}</div>
        ) : null}
      </div>

      {/* Eval scores — collapsed by default */}
      {evaluation ? (
        <CollapsibleSection title="Eval scores" defaultOpen={false}>
          <DataRow label="Research score" value={evaluation.research?.score?.toString()} />
          <DataRow label="Research action" value={evaluation.research?.action} />
          <DataRow label="Offer score" value={evaluation.offer?.score?.toString()} />
          <DataRow label="Offer action" value={evaluation.offer?.action} />
        </CollapsibleSection>
      ) : null}
    </div>
  );
}

function ShareButton({ url }) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  function handleShare() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      className={`copy-btn ${copied ? "copy-btn--copied" : ""}`}
      onClick={handleShare}
      aria-label="Copy share link"
    >
      {copied ? "Copied!" : "Share link"}
    </button>
  );
}

function ExportButton({ offer, growth, page, critique }) {
  function handleExport() {
    const text = exportPackageAsText({ offer, growth, page, critique });
    const slug = page?.slug || "launch-package";
    downloadTextFile(`${slug}.txt`, text);
  }

  return (
    <button type="button" className="export-btn" onClick={handleExport}>
      ↓ Export .txt
    </button>
  );
}

function FacebookAdPreview({ offer, growth }) {
  const headline = offer?.headline || growth?.hooks?.[0]?.hook || "Your headline here";
  const body = offer?.subheadline || offer?.outcome || "Your ad body copy goes here.";
  const cta = offer?.cta || "Learn More";
  const [copied, setCopied] = useState(false);

  const adText = `${headline}\n\n${body}\n\nCTA: ${cta}`;

  function handleCopy() {
    navigator.clipboard.writeText(adText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fb-ad-preview">
      <div className="fb-ad-preview__header">
        <div className="fb-ad-preview__avatar">LS</div>
        <div>
          <div className="fb-ad-preview__page-name">LaunchSense</div>
          <div className="fb-ad-preview__meta">Sponsored · <span>🌐</span></div>
        </div>
        <button type="button" className="copy-btn" style={{ marginLeft: "auto" }} onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="fb-ad-preview__body">{stripLeadingDash(body)}</p>
      <div className="fb-ad-preview__image-placeholder">
        <span>{stripLeadingDash(headline)}</span>
      </div>
      <div className="fb-ad-preview__footer">
        <div>
          <div className="fb-ad-preview__domain">launchsense.ai</div>
          <div className="fb-ad-preview__headline">{stripLeadingDash(headline)}</div>
        </div>
        <button type="button" className="fb-ad-preview__cta-btn">{cta}</button>
      </div>
    </div>
  );
}

function renderAssetsCard(message, storedPackage) {
  const page = message.data?.page;
  const growth = message.data?.growth;
  const offer = message.data?.offer;
  const critique = message.data?.critique;
  const shareUrl = page?.absoluteUrl || (page?.url ? `${window.location.origin}${page.url}` : null);

  const landingPage = storedPackage?.landing_page;
  const slug = page?.slug || storedPackage?.slug;
  const liveUrl = slug
    ? `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/p/${slug}`
    : (page?.absoluteUrl || page?.url || null);

  return (
    <div className="structured-card">
      <div className="assets-card__header">
        <p className="message-card__eyebrow">Assets</p>
        <div className="assets-card__actions">
          <ShareButton url={shareUrl} />
          <ExportButton offer={offer} growth={growth} page={page} critique={critique} />
        </div>
      </div>

      {liveUrl ? (
        <section className="structured-section">
          <h3>Landing Page</h3>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="view-page-btn"
          >
            View landing page →
          </a>
        </section>
      ) : page ? (
        <section className="structured-section">
          <h3>Landing Page</h3>
          <DataRow label="Slug" value={page.slug} />
          <LinkRow label="URL" href={page.absoluteUrl || page.url} />
        </section>
      ) : null}

      {growth?.channel ? (
        <CollapsibleSection title="Channel Recommendation">
          <DataRow label="Pick" value={growth.channel.pick} />
          <DataRow label="Why" value={growth.channel.why} multiline />
          <DataRow label="Action" value={growth.channel.action} multiline />
        </CollapsibleSection>
      ) : null}

      {growth?.cold_email ? (
        <CollapsibleSection
          title="Cold Email"
          copyText={`Subject: ${growth.cold_email.subject}\n\n${growth.cold_email.body}\n\nPS: ${growth.cold_email.ps}`}
        >
          <DataRow label="Subject" value={growth.cold_email.subject} multiline />
          <DataRow label="Body" value={growth.cold_email.body} multiline />
          <DataRow label="Evidence line" value={growth.cold_email.evidence_line} multiline />
          <LinkRow label="Evidence URL" href={growth.cold_email.evidence_url} />
          <DataRow label="PS" value={growth.cold_email.ps} multiline />
        </CollapsibleSection>
      ) : null}

      {growth?.linkedin_dm ? (
        <CollapsibleSection title="LinkedIn DM" copyText={growth.linkedin_dm}>
          <p className="message-card__pre">{growth.linkedin_dm}</p>
        </CollapsibleSection>
      ) : null}

      {(offer || growth) ? (
        <CollapsibleSection title="Facebook Ad Preview">
          <FacebookAdPreview offer={offer} growth={growth} />
        </CollapsibleSection>
      ) : null}

      {Array.isArray(growth?.hooks) && growth.hooks.length ? (
        <CollapsibleSection
          title="Hooks"
          copyText={growth.hooks.map(h => `[${h.platform}]\n${h.hook}`).join("\n\n")}
        >
          <ul className="structured-list">
            {growth.hooks.map((hook) => (
              <li key={`${hook.platform}-${hook.hook}`}>
                <strong>{hook.platform}</strong>
                <span>{hook.hook}</span>
                <span>{hook.angle}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}

function renderMessageContent(message, onStartGeneration, storedPackage) {
  switch (message.kind) {
    case "context":
      return renderContextCard(message);
    case "research":
      return renderResearchCard(message);
    case "offer":
      return <OfferCard message={message} onStartGeneration={onStartGeneration} />;
    case "assets":
      return renderAssetsCard(message, storedPackage);
    case "validation":
      return null;
    case "status":
      return (
        <p className="message-card__text message-card__text--status">
          <span className="status-spinner" aria-hidden="true">⏳</span> {message.text}
        </p>
      );
    case "critique":
      return (
        <>
          <p className="message-card__eyebrow">Critique</p>
          <div className="critique-body">{renderMarkdown(message.text)}</div>
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

export function MessageBubble({ message, onStartGeneration, storedPackage }) {
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
        {renderMessageContent(message, onStartGeneration, storedPackage)}
      </div>
    </article>
  );
}
