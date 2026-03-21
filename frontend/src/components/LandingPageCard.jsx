// frontend/src/components/LandingPageCard.jsx

const SCHEMES = {
  dark:  { bg: "#0f0f0f", text: "#f5f5f5", accent: "#6366f1", muted: "#888",  card: "#1a1a1a", border: "#2a2a2a" },
  light: { bg: "#fafafa", text: "#111",    accent: "#2563eb", muted: "#555",  card: "#fff",    border: "#e5e7eb" },
  warm:  { bg: "#fdf6f0", text: "#1a1a1a", accent: "#ea580c", muted: "#7a6a5a", card: "#fff",  border: "#f0e0d0" },
  bold:  { bg: "#0a0a23", text: "#fff",    accent: "#facc15", muted: "#aaa",  card: "#111133", border: "#2a2a4a" },
}

export default function LandingPageCard({ page, slug }) {
  const s = SCHEMES[page.color_scheme] ?? SCHEMES.dark
  const liveUrl = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/p/${slug}`

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: s.bg, color: s.text, borderRadius: 12, overflow: "hidden", border: `1px solid ${s.border}` }}>

      {/* Top bar */}
      <div style={{ background: s.card, borderBottom: `1px solid ${s.border}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: s.muted, fontFamily: "monospace" }}>
          /p/{slug}
        </span>
        <a href={liveUrl} target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: s.accent, textDecoration: "none", border: `1px solid ${s.accent}`, padding: "4px 12px", borderRadius: 6 }}>
          Open live page →
        </a>
      </div>

      {/* Hero */}
      <Section bg={s.bg} border={s.border}>
        <Tag color={s.accent}>Hero</Tag>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "12px 0 8px", lineHeight: 1.2 }}>
          {page.hero.headline}
        </h1>
        <p style={{ fontSize: 16, color: s.muted, marginBottom: 20 }}>
          {page.hero.subheadline}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button style={{ background: s.accent, color: "#fff", border: "none", padding: "12px 28px", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {page.hero.cta}
          </button>
          <span style={{ fontSize: 13, color: s.muted }}>{page.hero.cta_sub}</span>
        </div>
      </Section>

      {/* Problem */}
      <Section bg={s.card} border={s.border}>
        <Tag color={s.accent}>Problem</Tag>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 16px" }}>
          {page.problem.headline}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {page.problem.points.map((pt, i) => (
            <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{pt.pain}</div>
              <div style={{ fontSize: 13, color: s.accent, marginBottom: 4 }}>{pt.stat}</div>
              <a href={pt.source} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: s.muted, wordBreak: "break-all" }}>
                {pt.source}
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* Solution */}
      <Section bg={s.bg} border={s.border}>
        <Tag color={s.accent}>Solution</Tag>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 16px" }}>
          {page.solution.headline}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {page.solution.benefits.map((b, i) => (
            <div key={i} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, color: s.accent, marginBottom: 6 }}>{b.title}</div>
              <div style={{ fontSize: 14, color: s.muted, lineHeight: 1.5 }}>{b.body}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* VS Section */}
      <Section bg={s.card} border={s.border}>
        <Tag color={s.accent}>Vs</Tag>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "10px 0 16px" }}>
          {page.vs_section.headline}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: s.bg, border: `1px solid ${s.accent}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, color: s.accent, marginBottom: 10 }}>Us</div>
            {page.vs_section.us.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: s.accent }}>✓</span> {item}
              </div>
            ))}
          </div>
          <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 700, color: s.muted, marginBottom: 10 }}>Them</div>
            {page.vs_section.them.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 13, color: s.muted }}>
                <span>✗</span> {item}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section bg={s.bg} border={s.border}>
        <Tag color={s.accent}>Pricing</Tag>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 0" }}>
          <div style={{ fontSize: 13, color: s.muted, textDecoration: "line-through" }}>
            {page.pricing.anchor}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: s.accent }}>
            {page.pricing.price}
          </div>
          <div style={{ fontSize: 13, color: s.muted, textAlign: "center", maxWidth: 360 }}>
            {page.pricing.guarantee}
          </div>
          <button style={{ marginTop: 12, background: s.accent, color: "#fff", border: "none", padding: "14px 36px", borderRadius: 8, fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
            {page.hero.cta}
          </button>
        </div>
      </Section>

      {/* Sources */}
      {page.sources?.length > 0 && (
        <Section bg={s.card} border={s.border}>
          <Tag color={s.accent}>Sources</Tag>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {page.sources.map((src, i) => (
              <a key={i} href={src.url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: s.muted, border: `1px solid ${s.border}`, padding: "4px 10px", borderRadius: 4, textDecoration: "none" }}>
                {src.label}
              </a>
            ))}
          </div>
        </Section>
      )}

    </div>
  )
}

function Section({ children, bg, border }) {
  return (
    <div style={{ padding: "24px 24px", borderBottom: `1px solid ${border}`, background: bg }}>
      {children}
    </div>
  )
}

function Tag({ children, color }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color, opacity: 0.7 }}>
      {children}
    </span>
  )
}