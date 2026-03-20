# LaunchSense Agents Summary

LaunchSense is a hackathon-stage, chat-first agentic application whose sole purpose is to turn a business owner's new product or service idea into a commercially structured launch package inside a single conversation. The Agent drives the interaction end-to-end; there is no secondary dashboard, no forms, and no exported files -- every deliverable is emitted directly in chat.

## Core scope and outputs
- The agent captures an existing business type, current customer base, and a new product/service idea, then analyzes viability, presents a confirmed offer, and generates launch assets (landing page copy, channel recommendation, outreach email, and LinkedIn pitch). See `.kiro/specs/product-launch-package/requirements.md` for the full functional requirements and output order expectations.
- Deliverables obey strict word/character limits and section sequencing so the final chat response reads like a concise launch brief (requirements 4.1-4.10).

## Four-phase conversation flow
1. **Business Idea and Context** - gather the three required pieces of context via free-text conversation.
2. **Offer Analysis and Consolidation** - run the Viability Gate (four dimensions) and build a structured offer; if the idea is not viable, suggest alternatives until viability is confirmed.
3. **Offer Presentation** - deliver the formatted offer, accept adjustments, and wait for user confirmation before proceeding.
4. **Landing Page and Marketing Strategy** - independently generate landing page copy, channel recommendation, and outreach assets, then assemble them into the final chat delivery.

Phase ordering is enforced by the state machine so no subsequent phase starts until the previous one is confirmed, as described in `.kiro/specs/product-launch-package/design.md` (Architecture & Correctness Properties). The Viability Gate is a standalone, testable component that gates the path to Phase 3.

## Architecture and implementation guidance
- The single-agent architecture is steered by a deterministic phase state machine (`PhaseStateMachine`) that tracks the conversation state and ensures valid transitions (structure documented in `design.md`).
- Separate modules handle context collection, viability analysis, offer consolidation/presentation, asset generation, and delivery assembly -- each returns explicit success/failure results so delivery can gracefully report partial failures (Requirement 4.10 and design sections).
- All generators and the channel recommender are invoked in Phase 4, but failures in one do not block the rest; delivery still emits notices for any missing sections.
- Civic security is mandatory (see `.kiro/steering/tech.md`): tokens stored via environment variables, toolkit lock enabled, and requests go through the Civic MCP endpoint.

## Testing and correctness focus
The spec mandates both unit and property-based tests. Property-based tests map directly to the 15 correctness properties in the design doc, covering context summaries, phase transitions, viability analysis, offer formatting, word limits, asset constraints, and partial failure behavior. Unit tests should cover phase prompts, offer adjustments, refinement invitations, invalid transitions, and edge cases such as empty context fields or simultaneous generator failures.

## Project structure
- `.kiro/specs/product-launch-package/requirements.md` is the authoritative requirements source; prefer it over top-level `requirements.md`.
- `.kiro/steering/` holds product, structure, and tech notes that should be revisited as implementation details emerge.
- The repository currently contains only planning documents; update `tech.md` with actual stack/commands once code appears.
