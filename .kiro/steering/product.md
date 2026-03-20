# Product: LaunchSense

LaunchSense is a hackathon project that generates a commercially structured launch package through a conversational chat interface powered by agentic AI.

## What it does

A user describes their existing business and a new product/service idea in natural language. The AI Agent guides them through a fixed four-phase flow and produces a complete launch package — all inside the chat window. There is no form, no dashboard, no separate UI.

## Four-Phase Conversation Flow

1. **Business Idea and Context** — Agent gathers existing business type, customer base, and new idea
2. **Offer Analysis and Consolidation** — Agent analyses viability; if not viable, suggests alternatives and loops; if viable, produces a structured Offer
3. **Offer Presentation** — Agent presents the Offer for user confirmation before proceeding
4. **Landing Page and Marketing Strategy** — Agent generates landing page copy, channel recommendation, outreach email, and LinkedIn message

## Key Constraints

- Phases must execute in strict order; no phase begins until the previous is confirmed
- The Viability Gate in Phase 2 must classify an idea as VIABLE before Phase 3 can start
- All output is delivered in chat — no external files or dashboards
- Word/character limits apply to all generated copy (see requirements.md for specifics)
