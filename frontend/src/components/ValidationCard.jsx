export function ValidationCard({ data, onConfirm, onSelectAlternative, disabled }) {
  if (!data) return null;

  const { score, verdict, strengths = [], risks = [], recommendation, alternatives = [] } = data;

  const scoreColor =
    score >= 8 ? "#166534" : score >= 5 ? "#92400e" : "#b91c1c";
  const scoreBg =
    score >= 8 ? "#ecfdf3" : score >= 5 ? "#fffbeb" : "#fef2f2";
  const scoreBorder =
    score >= 8 ? "#bbf7d0" : score >= 5 ? "#fde68a" : "#fecaca";

  return (
    <div className="validation-card">
      <div className="validation-card__header">
        <div
          className="validation-score"
          style={{ color: scoreColor, background: scoreBg, borderColor: scoreBorder }}
        >
          {score}/10
        </div>
        <p className="validation-verdict">{verdict}</p>
      </div>

      <div className="validation-grid">
        {strengths.length > 0 && (
          <div className="validation-section validation-section--strengths">
            <p className="validation-section__label">Strengths</p>
            <ul className="validation-list">
              {strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {risks.length > 0 && (
          <div className="validation-section validation-section--risks">
            <p className="validation-section__label">Risks</p>
            <ul className="validation-list">
              {risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {recommendation && (
        <p className="validation-recommendation">{recommendation}</p>
      )}

      {alternatives.length > 0 && (
        <div className="validation-alternatives">
          <p className="validation-section__label">Stronger angles to consider</p>
          <div className="validation-alternatives__list">
            {alternatives.map((alt, i) => (
              <button
                key={i}
                className="validation-alt-card"
                disabled={disabled}
                onClick={() => onSelectAlternative?.(alt)}
              >
                <span className="validation-alt-card__title">{alt.title}</span>
                <span className="validation-alt-card__desc">{alt.description}</span>
                <span className="validation-alt-card__why">{alt.why_stronger}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="validation-card__actions">
        <button
          className="validation-confirm-btn"
          disabled={disabled}
          onClick={onConfirm}
        >
          Continue to asset selection
        </button>
      </div>
    </div>
  );
}
