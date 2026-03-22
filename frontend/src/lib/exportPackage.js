/**
 * Builds a plain-text export of the full launch package.
 * Returns a string suitable for download as a .txt file.
 */
export function exportPackageAsText({ offer, growth, page, critique }) {
  const lines = [];

  const section = (title) => {
    lines.push("");
    lines.push("=".repeat(60));
    lines.push(title.toUpperCase());
    lines.push("=".repeat(60));
  };

  const field = (label, value) => {
    if (value) lines.push(`${label}: ${value}`);
  };

  lines.push("LAUNCHSENSE — LAUNCH PACKAGE");
  lines.push(`Generated: ${new Date().toLocaleString()}`);

  if (offer) {
    section("Offer");
    field("Headline", offer.headline);
    field("Subheadline", offer.subheadline);
    field("Outcome", offer.outcome);
    field("Price", offer.price);
    field("Price anchor", offer.price_anchor);
    field("Guarantee", offer.guarantee);
    field("CTA", offer.cta);
    field("Urgency", offer.urgency);
    field("Competitor gap", offer.competitor_gap);
    if (Array.isArray(offer.bonuses) && offer.bonuses.length) {
      lines.push(`Bonuses: ${offer.bonuses.join(" | ")}`);
    }
    lines.push("");
    lines.push("ICP:");
    field("  Who", offer.icp?.who);
    field("  Pain", offer.icp?.pain);
    field("  Trigger", offer.icp?.trigger);
    field("  Evidence", offer.icp?.evidence_source);
  }

  if (growth?.cold_email) {
    section("Cold Email");
    field("Subject", growth.cold_email.subject);
    lines.push("");
    lines.push(growth.cold_email.body || "");
    lines.push("");
    field("PS", growth.cold_email.ps);
    field("Evidence", growth.cold_email.evidence_line);
  }

  if (growth?.linkedin_dm) {
    section("LinkedIn DM");
    lines.push(growth.linkedin_dm);
  }

  if (growth?.luffa_dm) {
    section("Luffa DM");
    lines.push(growth.luffa_dm);
  }

  if (Array.isArray(growth?.hooks) && growth.hooks.length) {
    section("Hooks");
    growth.hooks.forEach((h) => {
      lines.push(`[${h.platform}]`);
      lines.push(h.hook);
      lines.push(`Angle: ${h.angle}`);
      lines.push("");
    });
  }

  if (growth?.channel) {
    section("Channel Recommendation");
    field("Pick", growth.channel.pick);
    field("Why", growth.channel.why);
    field("First action", growth.channel.action);
  }

  if (page) {
    section("Landing Page");
    field("Slug", page.slug);
    field("URL", page.absoluteUrl || page.url);
  }

  if (critique) {
    section("Critique");
    lines.push(critique);
  }

  return lines.join("\n");
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
