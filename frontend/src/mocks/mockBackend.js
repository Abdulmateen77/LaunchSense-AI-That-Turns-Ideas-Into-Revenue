import { normalizeContext } from "../lib/contracts.js";
import { getMockScenario } from "../lib/runtimeConfig.js";

const mockSessions = new Map();

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-");
}

function createContext(overrides = {}) {
  return normalizeContext({
    idea: "AI onboarding audit service",
    niche: "HR consulting firms",
    target_customer: "HR consultancy owners serving scaling teams",
    core_pain: "Manual onboarding reviews take too much senior consultant time",
    existing_solutions: "Spreadsheets, one-off checklists, and manual interviews",
    notes: "Premium and outcome-driven",
    ...overrides
  });
}

function createResearch() {
  return {
    competitors: [
      {
        name: "People Process Lab",
        url: "https://example.com/people-process-lab",
        pricing_found: "£95/mo starter · £295/mo pro",
        pricing_url: "https://example.com/people-process-lab/pricing",
        weakness: "Template-heavy and light on implementation guidance"
      }
    ],
    reddit_quotes: [
      {
        quote: "Onboarding audits sound simple until the senior team loses a day assembling evidence.",
        subreddit: "consulting",
        upvotes: "187",
        thread_url: "https://reddit.com/r/consulting/comments/mock123"
      }
    ],
    market_signals: [
      {
        signal: "HR leaders continue consolidating vendors and favoring productized services.",
        source: "https://example.com/hr-vendor-trend"
      }
    ],
    pricing_range: {
      low: "£95/mo",
      high: "£295/mo",
      insight: "The market supports a premium managed-service wrapper."
    },
    all_sources: [
      "https://example.com/people-process-lab/pricing",
      "https://reddit.com/r/consulting/comments/mock123",
      "https://example.com/hr-vendor-trend"
    ]
  };
}

function createEval(action = "continue") {
  return {
    research: {
      passed: true,
      score: action === "retry" ? 0.45 : 0.88,
      critical_fails: action === "retry" ? ["competitors_empty"] : [],
      action: action === "retry" ? "retry" : "continue"
    },
    offer: {
      passed: action !== "regenerate_offer",
      score: action === "regenerate_offer" ? 0.49 : 0.82,
      critical_fails: action === "regenerate_offer" ? ["guarantee too vague"] : [],
      action
    }
  };
}

function createOffer() {
  return {
    icp: {
      who: "HR consultancy owners selling onboarding projects to 50-250 person teams",
      pain: "Senior consultants lose 6-8 hours per audit gathering onboarding evidence manually",
      trigger: "A client asks for a repeatable onboarding review but the team has no scalable process",
      evidence_source: "r/consulting thread about senior team time lost to evidence gathering"
    },
    headline: "Turn onboarding audits into a premium monthly offer",
    subheadline: "A structured onboarding audit service for HR consultancies that want recurring revenue.",
    outcome: "Launch a repeatable audit offer without adding senior delivery overhead",
    price: "£179/mo",
    price_anchor: "Comparable tools charge up to £295/mo before implementation support",
    guarantee: "If you cannot run your first audit in 14 days, we redo setup free.",
    bonuses: ["Audit scoring template", "Client-ready findings deck"],
    urgency: "Founding client pricing reserved for the first 10 firms.",
    cta: "Launch your audit offer",
    competitor_gap: "Competitors stop at templates; this package adds implementation and positioning support.",
    sources_used: [
      "https://example.com/people-process-lab/pricing",
      "https://reddit.com/r/consulting/comments/mock123"
    ]
  };
}

function createGrowthPack() {
  return {
    cold_email: {
      subject: "Manual audit prep?",
      body:
        "A lot of HR consultancies are still burning senior time gathering onboarding evidence before every audit.\n\n" +
        "One consulting thread with 187 upvotes described losing a full day pulling proof together before the real analysis even starts.\n\n" +
        "Would it be worth seeing a packaged audit flow that turns that work into a recurring offer?",
      evidence_line: "Consultants described losing a full day gathering onboarding evidence before analysis starts.",
      evidence_url: "https://reddit.com/r/consulting/comments/mock123",
      ps: "PS: We are offering founding-client pricing to the first 10 firms."
    },
    linkedin_dm:
      "Quick question: are your onboarding audits still driven by senior consultants pulling evidence together manually before they can even start the analysis?",
    hooks: [
      {
        platform: "LinkedIn",
        hook: "How much senior time disappears before your onboarding audit even starts?",
        angle: "Time-cost pain",
        evidence_basis: "Consulting thread about losing a full day gathering evidence"
      },
      {
        platform: "Twitter/X",
        hook: "The audit is profitable. The prep work is what kills it.",
        angle: "Margin pressure",
        evidence_basis: "Manual evidence gathering pain from consulting thread"
      },
      {
        platform: "cold email subject line",
        hook: "Manual audit prep?",
        angle: "Direct pain prompt",
        evidence_basis: "Consultants losing a day before analysis starts"
      }
    ],
    channel: {
      pick: "cold_email",
      why: "The ICP sells a premium service and responds well to specific operational pain framed in commercial terms.",
      action: "Send 10 tailored emails to HR consultancies with packaged-service positioning."
    }
  };
}

function createStoredPackage(context) {
  return {
    slug: slugify(context.idea),
    context,
    evidence: createResearch(),
    offer: createOffer(),
    landing_page: {
      slug: slugify(context.idea),
      hero: {
        headline: "Turn onboarding audits into a premium monthly offer",
        subheadline: "A structured onboarding audit service for HR consultancies.",
        cta: "Launch your audit offer",
        cta_sub: "Start with your first repeatable client-ready audit"
      }
    },
    growth_pack: createGrowthPack()
  };
}

function getScenarioName() {
  return getMockScenario();
}

function ensureSession(sessionId) {
  const id = sessionId || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!mockSessions.has(id)) {
    mockSessions.set(id, {
      turns: [],
      context: null
    });
  }

  return {
    id,
    session: mockSessions.get(id)
  };
}

export async function mockGetHealth(options = {}) {
  await delay(120);

  if ((options.scenario || getScenarioName()) === "health_failure") {
    throw new Error("Mock backend unavailable.");
  }

  return { status: "ok" };
}

export async function mockSendIntakeMessage(input, options = {}) {
  await delay(220);

  const scenario = options.scenario || getScenarioName();
  const { id, session } = ensureSession(input?.session_id);
  const message = typeof input?.message === "string" ? input.message.trim() : "";
  session.turns.push(message);

  if (scenario === "malformed_intake") {
    return { broken: true };
  }

  if (scenario === "intake_failure") {
    throw new Error("Mock intake request failed.");
  }

  if (scenario === "missing_context_first_turn" && session.turns.length === 1) {
    return {
      session_id: id,
      reply: "Tell me what you sell today, who you already serve, and the new offer idea.",
      complete: false,
      context: null
    };
  }

  const detailedContext = createContext({
    idea: message || "AI onboarding audit service",
    notes: session.turns.join("\n\n")
  });

  const vagueContext = createContext({
    idea: "Productized audit offer",
    notes: session.turns.join("\n\n")
  });

  if (scenario === "two_turn_context") {
    if (session.turns.length === 1) {
      return {
        session_id: id,
        reply: "Who is the primary client you want to sell this offer to?",
        complete: false,
        context: null
      };
    }

    session.context = detailedContext;
    return {
      session_id: id,
      reply: "CONTEXT_COMPLETE",
      complete: true,
      context: detailedContext
    };
  }

  if (scenario === "four_turn_context") {
    if (session.turns.length < 4) {
      return {
        session_id: id,
        reply:
          [
            "What kind of business do you run today?",
            "Who are your current customers?",
            "What is the most painful part of delivering this today?"
          ][session.turns.length - 1] || "Tell me a bit more about the current workaround.",
        complete: false,
        context: null
      };
    }

    session.context = detailedContext;
    return {
      session_id: id,
      reply: "CONTEXT_COMPLETE",
      complete: true,
      context: detailedContext
    };
  }

  if (message.split(/\s+/).length < 6) {
    return {
      session_id: id,
      reply: "Tell me what you sell today, who you already serve, and the new offer idea.",
      complete: false,
      context: null
    };
  }

  session.context = vagueContext;
  return {
    session_id: id,
    reply: "CONTEXT_COMPLETE",
    complete: true,
    context: vagueContext
  };
}

async function emitSequence(sequence, onEvent, signal) {
  for (const item of sequence) {
    if (signal?.aborted) {
      throw new Error("Generation cancelled.");
    }

    await delay(item.delay ?? 160);

    if (signal?.aborted) {
      throw new Error("Generation cancelled.");
    }

    if (item.event && onEvent) {
      await onEvent(item.event, item.data, { event: item.event, data: item.data, known: true });
    }
  }
}

export async function mockStreamGeneration(payload, { onEvent, scenario: scenarioOverride, signal } = {}) {
  const context = payload?.context || createContext({ idea: payload?.idea || "Mock idea" });
  const scenario = scenarioOverride || getScenarioName();
  const slug = slugify(context.idea);
  const research = createResearch();
  const offer = createOffer();
  const growth = createGrowthPack();

  const baseSequence = [
    { event: "status", data: { step: 0, label: "Researching your market..." } },
    { event: "research", data: research },
    { event: "status", data: { step: 1, label: "Building your offer..." } },
    { event: "eval", data: createEval("continue") },
    { event: "offer", data: offer },
    { event: "status", data: { step: 2, label: "Building page + outreach..." } },
    { event: "page", data: { slug, url: `/p/${slug}` } },
    { event: "growth", data: growth },
    { event: "status", data: { step: 3, label: "Critiquing...", sub: "streaming" } },
    { event: "critique_chunk", data: { text: "The headline is strong because it leads with a commercial outcome. " } },
    { event: "critique_chunk", data: { text: "The one change that will most improve conversions:" } },
    { event: "complete", data: { success: true, slug } }
  ];

  if (scenario === "research_retry") {
    await emitSequence(
      [
        { event: "status", data: { step: 0, label: "Researching your market..." } },
        { event: "status", data: { step: 0, label: "Deepening research...", sub: "First pass incomplete — retrying" } },
        ...baseSequence.slice(1)
      ],
      onEvent,
      signal
    );
    return;
  }

  if (scenario === "offer_regeneration") {
    await emitSequence(
      [
        ...baseSequence.slice(0, 3),
        { event: "eval", data: createEval("regenerate_offer") },
        ...baseSequence.slice(4)
      ],
      onEvent,
      signal
    );
    return;
  }

  if (scenario === "critique_unavailable") {
    await emitSequence(
      [
        ...baseSequence.slice(0, 9),
        { event: "critique_chunk", data: { text: "Critique unavailable." } },
        { event: "complete", data: { success: true, slug } }
      ],
      onEvent,
      signal
    );
    return;
  }

  if (scenario === "partial_asset_failure") {
    await emitSequence(
      [
        ...baseSequence.slice(0, 7),
        { event: "error", data: { message: "Growth asset generation failed after page creation." } }
      ],
      onEvent,
      signal
    );
    return;
  }

  if (scenario === "pipeline_error") {
    await emitSequence(
      [
        { event: "status", data: { step: 0, label: "Researching your market..." } },
        { event: "error", data: { message: "Pipeline failed before offer generation." } }
      ],
      onEvent,
      signal
    );
    return;
  }

  if (scenario === "generate_start_failure") {
    throw new Error("Generation stream failed to start.");
  }

  if (scenario === "complete_without_page") {
    await emitSequence(
      [
        { event: "status", data: { step: 0, label: "Researching your market..." } },
        { event: "research", data: research },
        { event: "status", data: { step: 1, label: "Building your offer..." } },
        { event: "offer", data: offer },
        { event: "complete", data: { success: true, slug } }
      ],
      onEvent,
      signal
    );
    return;
  }

  if (scenario === "empty_stream") {
    throw new Error("Generation stream ended without emitting any events.");
  }

  await emitSequence(baseSequence, onEvent, signal);
}

export async function mockFetchStoredPackage(slug, options = {}) {
  await delay(140);

  if ((options.scenario || getScenarioName()) === "stored_package_failure") {
    throw new Error("Mock stored package retrieval failed.");
  }

  return createStoredPackage(
    createContext({
      idea: slug ? slug.replace(/-/g, " ") : "AI onboarding audit service"
    })
  );
}
