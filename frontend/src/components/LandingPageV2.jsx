// frontend/src/components/LandingPageV2.jsx

const SCHEMES = {
  dark:  { bg: "#0f0f0f", text: "#f5f5f5", accent: "#6366f1", muted: "#888", card: "#1a1a1a", border: "#2a2a2a" },
  light: { bg: "#fafafa", text: "#111",    accent: "#2563eb", muted: "#555", card: "#fff",    border: "#e5e7eb" },
  warm:  { bg: "#fdf6f0", text: "#1a1a1a", accent: "#ea580c", muted: "#7a6a5a", card: "#fff", border: "#f0e0d0" },
  bold:  { bg: "#0a0a23", text: "#fff",    accent: "#facc15", muted: "#aaa", card: "#111133", border: "#2a2a4a" },
};

export default function LandingPageV2({ page }) {
  const s = SCHEMES[page.color_scheme] ?? SCHEMES.dark;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: s.bg, color: s.text, minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Hero */}
        <section style={{ padding: "72px 0 48px", borderBottom: `1px solid ${s.border}` }}>
          <h1 style={{ fontSize: "clamp(26px,5vw,42px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em" }}>
            {page.hero.headline}
          </h1>
          <p style={{ fontSize: 18, color: s.muted, lineHeight: 1.6, marginBottom: 32, maxWidth: 560 }}>
            {page.hero.subheadline}
          </p>
          <button style={{ background: s.accent, color: "#fff", border: "none", padding: "14px 32px", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
            {page.hero.cta}
          </button>
          <p style={{ fontSize: 13, color: s.muted, marginTop: 8 }}>{page.hero.cta_sub}</p>
        </section>

        {/* Problem */}
        <section style={{ padding: "48px 0", borderBottom: `1px solid ${s.border}` }}>
          <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.01em" }}>
            {page.problem.headline}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {page.problem.points.map((pt, i) => (
              <div key={i} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{pt.pain}</div>
                <div style={{ fontSize: 14, color: s.accent, marginBottom: 6 }}>{pt.stat}</div>
                <a href={pt.source} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: s.muted, wordBreak: "break-all" }}>{pt.source}</a>
              </div>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section style={{ padding: "48px 0", borderBottom: `1px solid ${s.border}` }}>
          <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.01em" }}>
            {page.solution.headline}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
            {page.solution.benefits.map((b, i) => (
              <div key={i} style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontWeight: 700, color: s.accent, marginBottom: 8 }}>{b.title}</div>
                <div style={{ fontSize: 14, color: s.muted, lineHeight: 1.6 }}>{b.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* VS */}
        <section style={{ padding: "48px 0", borderBottom: `1px solid ${s.border}` }}>
          <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.01em" }}>
            {page.vs_section.headline}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: s.card, border: `2px solid ${s.accent}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontWeight: 700, color: s.accent, marginBottom: 14, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Us</div>
              {page.vs_section.us.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14 }}>
                  <span style={{ color: s.accent, fontWeight: 700 }}>✓</span>{item}
                </div>
              ))}
            </div>
            <div style={{ background: s.card, border: `1px solid ${s.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontWeight: 700, color: s.muted, marginBottom: 14, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Them</div>
              {page.vs_section.them.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: s.muted }}>
                  <span>✗</span>{item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={{ padding: "48px 0", borderBottom: `1px solid ${s.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: s.muted, textDecoration: "line-through", marginBottom: 8 }}>{page.pricing.anchor}</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: s.accent, letterSpacing: "-0.03em", marginBottom: 12 }}>{page.pricing.price}</div>
          <div style={{ fontSize: 15, color: s.muted, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>{page.pricing.guarantee}</div>
          <button style={{ background: s.accent, color: "#fff", border: "none", padding: "16px 40px", borderRadius: 8, fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
            {page.hero.cta}
          </button>
        </section>

        {/* Sources */}
        {page.sources?.length > 0 && (
          <section style={{ padding: "32px 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: s.muted, marginBottom: 12 }}>Sources</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {page.sources.map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: s.muted, border: `1px solid ${s.border}`, padding: "4px 10px", borderRadius: 4, textDecoration: "none" }}>
                  {src.label}
                </a>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
