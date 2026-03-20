# Requirements Document

## Introduction

LaunchSense is a hackathon project that delivers a commercially structured launch package entirely through a conversational chat interface powered by agentic AI. The user describes their existing business and new product/service idea in natural language. The Agent then progresses through a fixed four-phase conversation flow: gathering business context, analysing and validating the offer (with a viability gate), presenting the finalised offer, and generating landing page copy plus marketing assets. There is no form, no dashboard, and no separate UI: the chat is the application.

## Conversation Flow

The Agent MUST progress through the following phases in order. A phase may only begin when the previous phase is complete.

```
Phase 1: BUSINESS IDEA AND CONTEXT
         ↓
Phase 2: OFFER ANALYSIS AND CONSOLIDATION
         ↓ (if viable)
         ↺ (if not viable → suggest alternative → restart Phase 2)
         ↓
Phase 3: OFFER PRESENTATION
         ↓
Phase 4: LANDING PAGE AND MARKETING STRATEGY
```

## Glossary

- **System**: The LaunchSense chat application
- **Agent**: The agentic AI that orchestrates the conversation and drives all generation steps
- **User**: A business owner or operator interacting with the Agent via chat
- **Business_Context**: Information gathered in Phase 1 — existing business type, current customer base, and new product/service idea
- **Viability_Gate**: The decision point in Phase 2 where the Agent determines whether the idea is commercially viable enough to proceed
- **Offer**: The structured commercial definition produced in Phase 2 — target segment, pain point, outcome, guarantee, and final offer statement
- **Launch_Package**: The complete output across Phases 3 and 4 — Offer, Landing Page copy, and Marketing Assets
- **CTA**: Call to action — the primary action the landing page asks a visitor to take

---

## Requirements

### Requirement 1: Phase 1 — Business Idea and Context

**User Story:** As a business owner, I want to describe my business and new idea through natural conversation, so that the Agent understands my situation before doing any analysis.

#### Acceptance Criteria

1. WHEN the User sends their first message, THE Agent SHALL open Phase 1 with a conversational prompt asking for: existing business type, current customer base description, and new product/service idea.
2. THE Agent SHALL accept input as free-text natural language across one or more conversational turns.
3. IF any of the three required context elements are missing after the User's initial message, THEN THE Agent SHALL ask a single targeted follow-up question to obtain only the missing element(s).
4. WHEN all three context elements have been gathered, THE Agent SHALL post a concise summary of its understanding and ask the User to confirm before proceeding to Phase 2.
5. THE Agent SHALL NOT proceed to Phase 2 until the User has confirmed the summary or provided a correction.

---

### Requirement 2: Phase 2 — Offer Analysis and Consolidation

**User Story:** As a business owner, I want the Agent to analyse my idea before building anything, so that I don't waste time launching something that won't work.

#### Acceptance Criteria

1. WHEN Phase 1 is confirmed, THE Agent SHALL enter Phase 2 and analyse the idea against the following dimensions: target customer clarity, pain point severity, market differentiation, and monetisation plausibility.
2. WHEN analysis is complete, THE Agent SHALL post a brief analysis summary (no more than 150 words) covering each dimension.
3. WHEN analysis is complete, THE Viability_Gate SHALL classify the idea as either VIABLE or NOT VIABLE based on the analysis.
4. IF the Viability_Gate classifies the idea as VIABLE, THEN THE Agent SHALL consolidate the analysis into a structured Offer (target segment, pain point, outcome statement, guarantee, final offer statement) and proceed to Phase 3.
5. IF the Viability_Gate classifies the idea as NOT VIABLE, THEN THE Agent SHALL:
   a. Explain clearly why the idea does not meet the viability threshold.
   b. Suggest at least one alternative or refined idea based on the User's Business_Context.
   c. Ask the User whether they want to proceed with the suggested alternative or provide a new idea.
6. WHEN the User accepts an alternative or provides a new idea in step 5c, THE Agent SHALL restart Phase 2 analysis with the updated idea.
7. THE Agent SHALL NOT proceed to Phase 3 until the Viability_Gate returns VIABLE.

---

### Requirement 3: Phase 3 — Offer Presentation

**User Story:** As a business owner, I want to see the finalised offer clearly presented before any assets are generated, so that I can confirm it reflects my intent.

#### Acceptance Criteria

1. WHEN Phase 2 produces a VIABLE Offer, THE Agent SHALL post the Offer in a clearly labelled chat message containing: target customer segment, core pain point, outcome statement, guarantee, and final offer statement.
2. THE Agent SHALL ask the User to confirm the Offer or request adjustments before proceeding to Phase 4.
3. IF the User requests adjustments, THEN THE Agent SHALL update the relevant Offer elements and re-present the Offer for confirmation.
4. THE Agent SHALL NOT proceed to Phase 4 until the User has confirmed the Offer.

---

### Requirement 4: Phase 4 — Landing Page and Marketing Strategy

**User Story:** As a business owner, I want a landing page draft and marketing assets delivered in chat, so that I can act on my launch immediately.

#### Acceptance Criteria

**Landing Page Copy**

1. WHEN Phase 3 is confirmed, THE Agent SHALL generate landing page copy containing: a headline (≤12 words), a subheadline (≤25 words), a problem statement (≤100 words), a solution explanation (≤150 words), and a CTA (≤8 words, single imperative phrase).

**Marketing Strategy — Channel Selection**

2. WHEN Phase 3 is confirmed, THE Agent SHALL evaluate two channels: LinkedIn and email.
3. THE Agent SHALL recommend a primary channel with a rationale of no more than 50 words.

**Marketing Assets**

4. WHEN the channel recommendation is made, THE Agent SHALL produce one outreach email of no more than 200 words aligned to the confirmed Offer.
5. WHEN the channel recommendation is made, THE Agent SHALL produce one LinkedIn message of no more than 300 characters aligned to the confirmed Offer.
6. Both assets SHALL reference the final offer statement from Phase 3.

**Delivery**

7. WHEN all Phase 4 content is generated, THE Agent SHALL post the complete output in a single chat message in the following order: (1) Landing Page Copy, (2) Channel Recommendation, (3) Email Asset, (4) LinkedIn Asset.
8. Each section SHALL be clearly labelled with a heading.
9. WHEN the full output has been posted, THE Agent SHALL invite the User to request refinements to any section.
10. IF any generation step fails, THE Agent SHALL post the successfully generated sections and clearly indicate which section failed and why.
