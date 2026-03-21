from __future__ import annotations

from pydantic import BaseModel, Field


# --- Sub-models ---

class Competitor(BaseModel):
    name: str = Field(min_length=1)
    url: str = Field(min_length=1)
    pricing_found: str = Field(min_length=1)  # "£49/mo" or "pricing not public"
    pricing_url: str = Field(min_length=1)
    weakness: str = Field(min_length=1)


class RedditQuote(BaseModel):
    quote: str = Field(min_length=1)
    subreddit: str = Field(min_length=1)
    upvotes: str = Field(min_length=1)
    thread_url: str = Field(min_length=1)


class MarketSignal(BaseModel):
    signal: str = Field(min_length=1)
    source: str = Field(min_length=1)


class PricingRange(BaseModel):
    low: str = Field(min_length=1)
    high: str = Field(min_length=1)
    insight: str = Field(min_length=1)


# --- Evidence ---

class Evidence(BaseModel):
    competitors: list[Competitor] = Field(default_factory=list, max_length=4)
    reddit_quotes: list[RedditQuote] = Field(default_factory=list, max_length=3)
    market_signals: list[MarketSignal] = Field(default_factory=list, max_length=4)
    pricing_range: PricingRange
    all_sources: list[str] = Field(default_factory=list, max_length=20)


# --- ICP and Offer ---

class ICP(BaseModel):
    who: str = Field(min_length=1)
    pain: str = Field(min_length=1)
    trigger: str = Field(min_length=1)
    evidence_source: str = Field(min_length=1)


class Offer(BaseModel):
    icp: ICP
    headline: str = Field(min_length=1)
    subheadline: str = Field(min_length=1)
    outcome: str = Field(min_length=1)
    price: str = Field(min_length=1)
    price_anchor: str = Field(min_length=1)
    guarantee: str = Field(min_length=1)
    bonuses: list[str] = Field(default_factory=list, max_length=3)
    urgency: str = Field(min_length=1)
    cta: str = Field(min_length=1)
    competitor_gap: str = Field(min_length=1)
    sources_used: list[str] = Field(default_factory=list, max_length=10)


# --- LandingPage sub-models and LandingPage ---

class LandingPageHero(BaseModel):
    headline: str = Field(min_length=1)
    subheadline: str = Field(min_length=1)
    cta: str = Field(min_length=1)
    cta_sub: str = Field(min_length=1)


class ProblemPoint(BaseModel):
    pain: str = Field(min_length=1)
    stat: str = Field(min_length=1)
    source: str = Field(min_length=1)


class LandingPageProblem(BaseModel):
    headline: str = Field(min_length=1)
    points: list[ProblemPoint] = Field(default_factory=list, max_length=3)


class SolutionBenefit(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)


class LandingPageSolution(BaseModel):
    headline: str = Field(min_length=1)
    benefits: list[SolutionBenefit] = Field(default_factory=list, max_length=3)


class VsSection(BaseModel):
    headline: str = Field(min_length=1)
    us: list[str] = Field(default_factory=list, max_length=6)
    them: list[str] = Field(default_factory=list, max_length=6)


class LandingPagePricing(BaseModel):
    price: str = Field(min_length=1)
    anchor: str = Field(min_length=1)
    guarantee: str = Field(min_length=1)


class LandingPageSource(BaseModel):
    label: str = Field(min_length=1)
    url: str = Field(min_length=1)


class LandingPage(BaseModel):
    slug: str = Field(min_length=1)
    color_scheme: str = Field(min_length=1)
    hero: LandingPageHero
    problem: LandingPageProblem
    solution: LandingPageSolution
    vs_section: VsSection
    pricing: LandingPagePricing
    sources: list[LandingPageSource] = Field(default_factory=list, max_length=10)


# --- GrowthPack sub-models and GrowthPack ---

class ColdEmail(BaseModel):
    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)
    evidence_line: str = Field(min_length=1)
    evidence_url: str = Field(min_length=1)
    ps: str = Field(min_length=1)


class Hook(BaseModel):
    platform: str = Field(min_length=1)
    hook: str = Field(min_length=1)
    angle: str = Field(min_length=1)
    evidence_basis: str = Field(min_length=1)


class Channel(BaseModel):
    pick: str = Field(min_length=1)  # cold_email|linkedin|content
    why: str = Field(min_length=1)
    action: str = Field(min_length=1)


class GrowthPack(BaseModel):
    cold_email: ColdEmail
    linkedin_dm: str = Field(min_length=1)
    hooks: list[Hook] = Field(min_length=3, max_length=3)
    channel: Channel


# --- EvalResult ---

class EvalResult(BaseModel):
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    critical_fails: list[str] = Field(default_factory=list, max_length=10)
    action: str = Field(min_length=1)  # continue|retry|warn|regenerate_offer


# --- EnrichedContext ---

class EnrichedContext(BaseModel):
    idea: str = Field(min_length=1)
    niche: str = Field(min_length=1)
    target_customer: str = Field(min_length=1)
    core_pain: str = Field(min_length=1)
    existing_solutions: str = Field(min_length=1)
    notes: str = ""


# --- GenerateRequest and ModelChoices ---

class ModelChoices(BaseModel):
    research: str | None = None
    offer: str | None = None
    builder: str | None = None
    growth: str | None = None
    critique: str | None = None


class GenerateRequest(BaseModel):
    idea: str = Field(min_length=1)
    context: EnrichedContext | None = None
    models: ModelChoices | None = None
