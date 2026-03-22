const STEPS = [
  { key: "research", label: "Researching market" },
  { key: "offer",    label: "Building offer" },
  { key: "assets",   label: "Creating assets" },
  { key: "critique", label: "Critiquing" },
];

const STAGE_TO_STEP = {
  research: 0,
  offer:    1,
  assets:   2,
  critique: 3,
  complete: 4,
};

export function GenerationProgress({ stage }) {
  const activeStep = STAGE_TO_STEP[stage] ?? 0;

  return (
    <div className="gen-progress" aria-label="Generation progress">
      {STEPS.map((step, i) => {
        const done    = i < activeStep;
        const current = i === activeStep;
        return (
          <div
            key={step.key}
            className={`gen-progress__step ${done ? "gen-progress__step--done" : ""} ${current ? "gen-progress__step--active" : ""}`}
          >
            <div className="gen-progress__dot">
              {done ? "✓" : i + 1}
            </div>
            <span className="gen-progress__label">{step.label}</span>
            {i < STEPS.length - 1 ? <div className="gen-progress__line" /> : null}
          </div>
        );
      })}
    </div>
  );
}
