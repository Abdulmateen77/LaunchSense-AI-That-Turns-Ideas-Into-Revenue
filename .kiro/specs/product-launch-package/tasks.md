# Implementation Plan: LaunchSense — Product Launch Package

## Overview

Implement the LaunchSense chat-native agentic application in TypeScript. The pipeline runs sequentially: context gathering → confirmation → Offer_Engine → Landing_Page_Generator → Channel_Selector → Asset_Generator → Launch Package delivery. All state lives in memory; the chat history is the only persistence.

## Tasks

- [ ] 1. Define TypeScript types and interfaces
  - Create `src/types.ts` with all data model interfaces: `BusinessContext`, `Offer`, `LandingPageCopy`, `Channel`, `ChannelSelection`, `LaunchAssets`, `LaunchPackage`, `ConversationPhase`, `ConversationState`, `ConversationTurn`, `AgentResponse`
  - Add error types: `OfferError`, `CopyError`, `AssetError`
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 2. Implement Offer_Engine
  - [ ] 2.1 Implement `deriveOffer(context: BusinessContext): Offer | OfferError` in `src/offerEngine.ts`
    - Derive `targetSegment`, `painPoint`, `outcomeStatement`, `riskReduction`, and `finalOfferStatement` from confirmed context
    - Return `OfferError` when a coherent offer cannot be derived
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.2 Write property test for Offer_Engine completeness
    - **Property 3: Offer completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
    - Arbitrary confirmed `BusinessContext` → all five Offer fields non-empty
    - Tag: `// Feature: product-launch-package, Property 3: Offer completeness`

- [ ] 3. Implement Landing_Page_Generator
  - [ ] 3.1 Implement `generateCopy(offer: Offer): LandingPageCopy | CopyError` in `src/landingPageGenerator.ts`
    - Produce headline (≤ 12 words), subheadline (≤ 25 words), problemStatement (≤ 100 words), solutionExplanation (≤ 150 words), cta (≤ 8 words)
    - Return `CopyError` when a required section cannot be produced
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.2 Write property test for landing page copy length constraints
    - **Property 4: Landing page copy length constraints**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - Arbitrary `Offer` → all five copy fields within their word/character limits simultaneously
    - Tag: `// Feature: product-launch-package, Property 4: Landing page copy length constraints`

- [ ] 4. Implement Channel_Selector
  - [ ] 4.1 Implement `selectChannel(context: BusinessContext): ChannelSelection` in `src/channelSelector.ts`
    - Evaluate `cold_outreach`, `existing_customer_email`, `organic_social` and select one primary channel
    - Rationale ≤ 50 words; set `isDefault: true` and default to `existing_customer_email` when context is insufficient
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 4.2 Write property test for channel selection validity and rationale length
    - **Property 5: Channel selection validity and rationale length**
    - **Validates: Requirements 4.1, 4.2**
    - Arbitrary `BusinessContext` → `primary` is one of the three valid enum values, `rationale` ≤ 50 words
    - Tag: `// Feature: product-launch-package, Property 5: Channel selection validity and rationale length`

- [ ] 5. Implement Asset_Generator
  - [ ] 5.1 Implement `generateAssets(offer: Offer, channel: ChannelSelection): LaunchAssets | AssetError` in `src/assetGenerator.ts`
    - Produce email (≤ 200 words) and LinkedIn message (≤ 300 characters) referencing `finalOfferStatement`
    - Return `AssetError` when a required asset cannot be produced
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 5.2 Write property test for asset length constraints
    - **Property 6: Asset length constraints**
    - **Validates: Requirements 5.1, 5.2**
    - Arbitrary `Offer` + `ChannelSelection` → email ≤ 200 words, linkedInMessage ≤ 300 characters
    - Tag: `// Feature: product-launch-package, Property 6: Asset length constraints`

  - [ ]* 5.3 Write property test for assets referencing the final offer statement
    - **Property 7: Assets reference the final offer statement**
    - **Validates: Requirements 5.3**
    - Arbitrary `Offer` + `ChannelSelection` → both email and LinkedIn message contain key terms from `finalOfferStatement`
    - Tag: `// Feature: product-launch-package, Property 7: Assets reference the final offer statement`

- [ ] 6. Checkpoint — Ensure all pipeline unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Launch Package renderer
  - [ ] 7.1 Implement `renderLaunchPackage(pkg: LaunchPackage): string` in `src/renderer.ts`
    - Render a single Markdown-formatted chat message with sections in fixed order: (1) Offer, (2) Landing Page, (3) Launch Assets, each with a clear heading
    - Replace failed sections with `[Section could not be generated: <reason>]`
    - _Requirements: 6.1, 6.2, 6.4_

  - [ ]* 7.2 Write property test for Launch Package section ordering and labelling
    - **Property 8: Launch Package section ordering and labelling**
    - **Validates: Requirements 6.1, 6.2**
    - Arbitrary `LaunchPackage` → rendered message contains all three section headings in correct order (Offer before Landing Page, Landing Page before Launch Assets)
    - Tag: `// Feature: product-launch-package, Property 8: Launch Package section ordering and labelling`

- [ ] 8. Implement Agent orchestrator
  - [ ] 8.1 Implement conversation phase management and context extraction in `src/agent.ts`
    - Manage `ConversationPhase` transitions: `gathering_context` → `confirming_context` → `generating` → `delivered` → `refining`
    - Extract `businessType`, `customerBase`, `newIdea` from free-text turns; track which fields are present
    - After two consecutive failed attempts to gather a missing element, post explanation and invite restart
    - _Requirements: 1.1, 1.2, 1.4_

  - [ ]* 8.2 Write property test for follow-up targeting only missing context fields
    - **Property 1: Follow-up targets only missing context fields**
    - **Validates: Requirements 1.4**
    - Arbitrary partial `BusinessContext` (any combination of missing fields) → agent follow-up asks about exactly the missing fields and does not re-ask for fields already provided
    - Tag: `// Feature: product-launch-package, Property 1: Follow-up targets only missing context fields`

  - [ ] 8.3 Implement confirmation flow and pipeline sequencing in `src/agent.ts`
    - When all three context fields are present, post a summary confirmation message and await user confirmation
    - After confirmation, invoke pipeline in order: `deriveOffer` → `generateCopy` → `selectChannel` → `generateAssets`
    - Handle each step's error type per the error handling spec; halt pipeline on `OfferError`, continue with partial package for downstream failures
    - Post completed `LaunchPackage` via `renderLaunchPackage`, then invite refinements
    - _Requirements: 1.3, 1.5, 2.6, 3.6, 5.4, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 8.4 Write property test for generation not beginning before context is confirmed
    - **Property 2: Generation does not begin before context is confirmed**
    - **Validates: Requirements 1.3, 1.5**
    - Arbitrary conversation histories → no Offer, LandingPageCopy, ChannelSelection, or LaunchAssets content appears in agent output before a `confirming_context` phase turn has occurred
    - Tag: `// Feature: product-launch-package, Property 2: Generation does not begin before context is confirmed`

- [ ] 9. Write unit tests
  - [ ] 9.1 Write example-based unit tests in `src/__tests__/agent.test.ts`
    - First message triggers a prompt covering all three context elements (Requirement 1.1)
    - Post-delivery message contains refinement invitation (Requirement 6.3)
    - _Requirements: 1.1, 6.3_

  - [ ] 9.2 Write error condition unit tests
    - `OfferError` → agent posts clarification request and halts pipeline
    - `CopyError` → agent names the missing section and continues pipeline
    - `AssetError` → agent names the missing asset
    - Partial package delivery uses `[Section could not be generated: <reason>]` placeholder
    - _Requirements: 2.6, 3.6, 5.4, 6.4_

  - [ ] 9.3 Write edge case unit tests
    - `Channel_Selector` defaults to `existing_customer_email` when context is ambiguous (`isDefault: true`)
    - Empty or whitespace `BusinessContext` fields are handled gracefully without crashing
    - _Requirements: 4.3_

  - [ ] 9.4 Write integration test for full pipeline
    - Confirmed `BusinessContext` → rendered `LaunchPackage` message with all sections present and correctly ordered
    - _Requirements: 1.3, 1.5, 6.1, 6.2_

- [ ] 10. Configure fast-check and wire test suite
  - Add `fc.configureGlobal({ numRuns: 100 })` at the top of the property test file
  - Ensure all property tests and unit tests are discoverable by the test runner
  - _Requirements: all_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with 100 iterations each; each test is tagged with its property number
- Unit tests cover examples, error conditions, edge cases, and full pipeline integration
- All state is in-memory; no database or auth is needed
