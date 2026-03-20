# Tech Stack

> The repository is in early spec/planning stage. No implementation files exist yet. Update this file as the stack is decided and code is added.

## Known / Expected Stack

- **Interface**: Chat UI (the chat is the entire application — no separate frontend views)
- **AI**: Agentic AI orchestrating multi-phase conversation and content generation
- **Architecture**: Single agent with a fixed phase-based state machine

## Security: Civic ([docs.civic.com](https://docs.civic.com/civic/quickstart/clients/agents))

Civic is the mandatory security layer for all AI agent implementations in this project.

- Connect agents to Civic via MCP at `https://app.civic.com/hub/mcp`
- Authenticate using a **Civic Token** (bearer token) stored as an environment variable — never hardcoded
  ```
  CIVIC_TOKEN=your-civic-token-here
  CIVIC_URL=https://app.civic.com/hub/mcp?profile=your-toolkit-alias
  ```
- Always lock agents to a specific toolkit profile (`lock=true` is the default when a profile is set) — this prevents toolkit escape and prompt injection attacks
- Use the `profile` query parameter to scope the agent to its assigned toolkit (e.g. `?profile=launch-agent`)
- Do not use `lock=false` unless the use case explicitly requires toolkit switching; for LaunchSense this should always be locked
- Pass the token as a Bearer header in all requests:
  ```ts
  headers: { Authorization: `Bearer ${process.env.CIVIC_TOKEN}` }
  ```
  ```python
  headers = {"Authorization": f"Bearer {os.environ['CIVIC_TOKEN']}"}
  ```
- Skills can be pre-loaded via the `skills` query parameter if reusable capabilities are defined on the Civic account

## Conventions to Follow When Implementing

- The Agent must enforce phase ordering in code — no skipping or parallel phases
- Viability Gate logic should be a discrete, testable function/module
- Each generation step (offer, landing page, email, LinkedIn) should be independently callable so failed steps can be reported without blocking successful ones (per Requirement 4.10)

## Commands

_None defined yet — update when build/test/run scripts are added._
