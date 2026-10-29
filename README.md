# BLINK AI — Structured AI App Builder

BLINK is being built around three engineering principles:

1. **Architecture first** — define requirements and module boundaries before generating code.
2. **Security by default** — apply enforceable rules and automated checks rather than relying on model instructions alone.
3. **Verified changes** — treat every generated change as a patch that must pass configured quality gates.

## Current foundation

This branch introduces a clean, isolated first implementation of the BLINK experience:

- Responsive black, white, and indigo workspace UI.
- Project brief form and working planning endpoint.
- Deterministic first-pass planner for features, pages, data models, suggested file structure, and security checks.
- Defined specialist-agent responsibilities.
- Central release-gate helper and tests.
- No API keys or external AI credentials are required for the planning preview.

## Important scope note

The current planner uses transparent rule-based heuristics. It is **not yet connected to a language model**, and it does not generate or execute application source code, provision databases, run sandboxed builds, or deploy applications. The interface labels this as a planning preview to avoid implying those capabilities already exist.

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
- `lib/agents/`: explicit agent role contracts.
- `lib/security/`: default security policy.
- `lib/orchestrator/`: workflow stages and release-gate decision helper.
- `tests/`: automated checks.

## Planned implementation phases

1. Connect a provider-neutral model gateway and structured outputs.
2. Persist project specs, versions, and audit events in PostgreSQL.
3. Implement architecture manifests and safe file patch application.
4. Add isolated build/test workers with strict resource and network limits.
5. Integrate secret scanning, static analysis, and dependency vulnerability checks.
6. Add preview environments, explicit deployment approvals, and monitoring.

Security scanners reduce risk but do not prove the absence of vulnerabilities. Generated code must remain untrusted until it passes independent checks.
