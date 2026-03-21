// frontend/src/components/PreviewPage.jsx
import { useEffect, useState } from "react";
import LandingPageV2 from "./LandingPageV2";

export default function PreviewPage({ slug }) {
  const [page, setPage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Vite serves /public as static — no proxy needed
    fetch(`/preview/${slug}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Preview not found (${r.status}). Run python test_builder.py first.`);
        return r.json();
      })
      .then(setPage)
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#c00" }}>
        <strong>{error}</strong>
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui", color: "#888" }}>
        Loading...
      </div>
    );
  }

  return <LandingPageV2 page={page} />;
}
