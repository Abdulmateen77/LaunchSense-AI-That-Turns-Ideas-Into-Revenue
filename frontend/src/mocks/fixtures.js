export const mockQaFixtures = [
  {
    id: "vague-opening",
    category: "intake",
    title: "Vague opening message",
    scenario: "missing_context_first_turn",
    openingMessage: "Audit offer",
    expected: "Frontend stays in intake mode and shows a follow-up question."
  },
  {
    id: "detailed-opening",
    category: "intake",
    title: "Detailed opening message",
    scenario: "two_turn_context",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "Context completes cleanly after the follow-up turn."
  },
  {
    id: "happy-path",
    category: "generation",
    title: "Happy path",
    scenario: "happy_path",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "Research, offer, assets, critique, and stored package all complete."
  },
  {
    id: "corrective-path",
    category: "generation",
    title: "Corrective path",
    scenario: "two_turn_context",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "Context completes, then the user can save a correction in chat before generation."
  },
  {
    id: "research-retry",
    category: "generation",
    title: "Research retry",
    scenario: "research_retry",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "A second status event appears for deepened research before the rest of the stream continues."
  },
  {
    id: "offer-regeneration",
    category: "generation",
    title: "Offer regeneration",
    scenario: "offer_regeneration",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "The eval payload marks the offer for regeneration before final offer output."
  },
  {
    id: "critique-unavailable",
    category: "generation",
    title: "Critique unavailable",
    scenario: "critique_unavailable",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "Generation completes while critique degrades gracefully."
  },
  {
    id: "partial-asset-failure",
    category: "generation",
    title: "Partial asset failure",
    scenario: "partial_asset_failure",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "The page result is preserved, then the thread enters an error state."
  },
  {
    id: "pipeline-error",
    category: "generation",
    title: "Pipeline error",
    scenario: "pipeline_error",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "The thread fails early and shows a hard error state."
  },
  {
    id: "health-unavailable",
    category: "integration",
    title: "Backend unavailable on load",
    scenario: "health_failure",
    openingMessage: "",
    expected: "Header status shows backend unavailable while the UI remains usable."
  },
  {
    id: "intake-failure",
    category: "integration",
    title: "Intake request failure",
    scenario: "intake_failure",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "The thread shows an error but the shell remains usable."
  },
  {
    id: "generate-start-failure",
    category: "integration",
    title: "Generate start failure",
    scenario: "generate_start_failure",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "Generation fails before the stream begins and the thread shows a recoverable error."
  },
  {
    id: "stored-package-failure",
    category: "integration",
    title: "Stored package retrieval failure",
    scenario: "stored_package_failure",
    openingMessage: "I run an HR consultancy and want to launch an AI onboarding audit service.",
    expected: "The streamed results remain visible even when stored-package enrichment fails."
  }
];
