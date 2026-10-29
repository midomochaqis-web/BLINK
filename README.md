# BLINK AI — Structured AI App Builder

BLINK is being built around three engineering principles:

1. **Architecture first** — define requirements and module boundaries before generating code.
2. **Security by default** — apply enforceable rules and automated checks rather than relying on model instructions alone.
3. **Verified changes** — treat every generated change as a patch that must pass configured quality gates.

## Current foundation

This branch introduces a clean, isolated first implementation of the BLINK experience:

- Responsive black, white, and indigo workspace UI.
- Project brief form and working planning endpoint.
- Architecture manifest preview endpoint (`POST /api/architecture`) with path, duplicate, and dependency validation.
- Deterministic first-pass planner for features, pages, data models, suggested file structure, and security checks.
- Defined specialist-agent responsibilities.
- Central release-gate helper and tests.
- Documentation for the current systems, agent responsibilities, and implementation boundaries (`docs/BLINK_SYSTEMS_AND_AGENTS.md`).
- No API keys or external AI credentials are required for the planning preview.

## Important scope note

The planner and architecture preview use transparent rule-based heuristics and are **not connected to a language model**. A separate `/api/generate` route can call a configured OpenAI-compatible provider to create a standalone HTML preview and supporting files, but it requires server-side provider configuration plus authenticated Supabase setup. BLINK does not yet provide a secure arbitrary-code build worker, production sandboxed builds, automatic database provisioning, or application deployment.

## Requirements

- Node.js 20.9 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Validate

```bash
npm run typecheck
npm test
npm run build
```

## Architecture direction

- `app/`: Next.js routes and HTTP boundaries.
- `lib/planner/`: validated request schema and initial blueprint generator.
- `lib/architecture/`: architecture manifest construction and validation.
- `lib/agents/`: explicit agent role contracts.
- `lib/security/`: default security policy.
- `lib/orchestrator/`: workflow stages and release-gate decision helper.
- `tests/`: automated checks.

## Planned implementation phases

1. Connect a provider-neutral model gateway and structured outputs.
2. Persist project specs, versions, and audit events in PostgreSQL.
3. Extend the architecture manifest into safe, architecture-constrained multi-file patch application.
4. Add isolated build/test workers with strict resource and network limits.
5. Integrate secret scanning, static analysis, and dependency vulnerability checks.
6. Add preview environments, explicit deployment approvals, and monitoring.

Security scanners reduce risk but do not prove the absence of vulnerabilities. Generated code must remain untrusted until it passes independent checks.
