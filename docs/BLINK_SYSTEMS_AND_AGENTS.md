# BLINK — Systems, Agents, and Implementation Status

This document describes the current implementation on the `blink-from-scratch` branch. It separates working code from planned capabilities so the product does not overstate what is available.

## 1. Current system map

| System | Location | Responsibility | Current status |
| --- | --- | --- | --- |
| Product planner | `lib/planner/` and `POST /api/plan` | Converts a short brief into suggested features, pages, data models, file areas, stack, and security checks | Working deterministic preview; not an LLM |
| Architecture manifest | `lib/architecture/manifest.ts` and `POST /api/architecture` | Converts the planner output into a structured manifest and validates paths, duplicates, and dependency references | Implemented; deterministic preview |
| AI generation | `POST /api/generate` | Calls an OpenAI-compatible chat-completions provider and validates generated HTML/supporting files | Requires server-side provider key and Supabase auth/quota setup |
| Preview security | `lib/generation/security.ts` | Rejects unsafe file paths and adds a restrictive Content Security Policy to preview HTML | Implemented safeguards; not a substitute for a sandbox |
| Agent role contracts | `lib/agents/roles.ts` | Defines Planner, Architect, Security, Builder, and Verifier responsibilities | Contracts only; these are not five independently running AI agents |
| Workflow/release gates | `lib/orchestrator/workflow.ts` | Describes workflow stages and blocks release when required checks fail | Decision helper implemented; production evidence must come from real CI/security tools |
| Default security policy | `lib/security/policy.ts` | States required security rules and release gates | Policy definition implemented |
| Persistence | `supabase/migrations/` | Database schema and generation-quota support | Requires a configured Supabase project and applied migrations |

## 2. Agent responsibilities

### Planner
- Extract user goals, features, user journeys, constraints, and acceptance criteria.
- Ask for clarification when requirements conflict or omit critical decisions.
- Output: a versioned product specification.
- Current implementation: keyword-based first-pass planning. It does not yet use an LLM to reason about requirements.

### Architect
- Define modules, file boundaries, dependencies, data models, and API boundaries before code generation.
- Keep business logic out of giant single-file components and separate server-only code from browser code.
- Output: an architecture manifest that can be checked before code generation.
- Current implementation: `POST /api/architecture` returns a deterministic manifest. Validation checks safe relative paths, case-insensitive duplicate paths, and dependency references. It does not yet generate a full multi-file Next.js codebase.

### Security
- Treat prompts, repository files, model output, and generated source as untrusted input.
- Require server-side authentication/authorization, per-resource ownership checks, input validation, rate limits, secret scanning, dependency scanning, and auditability.
- Output: explicit policy checks and release-blocking findings.
- Current implementation: baseline policy and preview/path safeguards exist. Automated scanning and comprehensive authorization tests must be integrated into the build pipeline.

### Builder
- Implement small, reviewable changes within the approved architecture.
- Preserve unrelated features during edits and return complete file contents or a bounded patch.
- Never execute generated code in the web request process.
- Current implementation: the configured AI generation route returns a standalone HTML preview and supporting files. It is not yet a secure arbitrary-code build worker.

### Verifier
- Run type checking, unit/integration/end-to-end tests, build checks, secret scanning, dependency scanning, and authorization tests.
- Report actual command/tool results, not claims made by the model.
- Output: a traceable verification report.
- Current implementation: release-gate helper and unit tests exist. There is no claim here that CI/build checks have passed in this change.

### Orchestrator
- Runs stages in order, records outputs, blocks on failed gates, and requests human approval for risky actions.
- Current implementation: stage definitions and a release decision helper exist. Durable job queues, retries, signed tool evidence, and human-approval workflows remain future work.

## 3. New architecture preview API

Endpoint: `POST /api/architecture`

Example request:

```json
{
  "projectName": "Service booking",
  "description": "Build a responsive service booking app with accounts, availability, reservations, and an admin dashboard."
}
```

The request follows the same schema as `POST /api/plan`: project name up to 60 characters and a description between 12 and 4,000 characters. The route returns:

- `manifest.version`: schema version.
- `manifest.entries`: module/file areas with a path, kind, purpose, and dependency list.
- `manifest.recommendedStack`: proposed stack.
- `manifest.dataModels`: initial data-model list.
- `manifest.securityControls`: security checks that should be addressed.
- `mode: "rule-based-preview"`: explicitly identifies the result as a deterministic preview.

Malformed JSON returns HTTP 400, oversized requests return HTTP 413, and a manifest validation failure returns HTTP 422. Responses use `Cache-Control: no-store`.

## 4. Security invariants

1. Never commit real provider keys or database credentials. Keep provider secrets server-only; use `.env.example` for variable names.
2. Do not trust a hidden UI button as authorization. Every protected server route must authenticate the caller and check ownership/permissions.
3. Reject absolute paths, traversal segments, reserved secret/config paths, duplicate paths, and oversized content before storing generated files.
4. Keep preview HTML in a restrictive sandbox/CSP. The CSP is defense in depth, not a substitute for a properly configured sandboxed iframe.
5. Do not run generated code in the Next.js process. Use isolated workers with CPU, memory, time, filesystem, and network restrictions.
6. Release only on verified build/test/security results. A model's statement that a test passed is not evidence.
7. Never expose Supabase service-role keys or AI-provider keys to the browser.
8. Treat successful automated scans as risk reduction, not proof that an application is vulnerability-free.

## 5. Configure and validate locally

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
# Fill only the variables needed for the feature being tested.
npm run typecheck
npm test
npm run build
npm run dev
```

For AI generation, configure a valid server-side `OPENAI_API_KEY`, an optional `OPENAI_BASE_URL`, and `OPENAI_MODEL`. Configure Supabase and apply the repository's migrations before using the authenticated generation route. Never paste secret values into source control or client-side environment variables.

## 6. Next engineering milestones

1. Add a provider-neutral model gateway with structured outputs, timeouts, token/cost budgets, and provider error normalization.
2. Store projects, manifest versions, generated-file versions, and audit events with tenant isolation and row-level access policies.
3. Replace preview-only generation with an architecture-constrained multi-file patch pipeline.
4. Add patch review and path/content validation before any generated file can be accepted.
5. Run builds/tests in ephemeral isolated workers with default-deny network access.
6. Integrate secret scanning, static analysis, dependency vulnerability scanning, and authorization tests as mandatory release gates.
7. Add preview deployments, explicit approval for deployment, rollback, monitoring, and usage limits.
8. Add durable background jobs, retries, idempotency, and traceable workflow events.

## Scope note

The new manifest endpoint is an architecture-preview capability, not a promise that BLINK already generates, executes, secures, or deploys a complete production application. Production readiness requires the milestones above plus successful automated validation in the target environment.
