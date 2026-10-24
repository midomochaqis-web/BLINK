# BLINK

BLINK is an AI-powered application-building workspace. Describe an idea in plain language, generate a self-contained working web app, inspect its preview and source, and keep projects in a user-owned workspace.

## Current implementation

- Next.js App Router application with a responsive black / white / indigo interface.
- Server-side AI generation endpoint using an OpenAI-compatible Chat Completions API.
- Supabase email/password authentication and user-owned project persistence.
- Per-user hourly generation quota enforced by a database RPC (20 generations per hour by default).
- Row Level Security (RLS) policies on project data.
- Generated HTML rendered in a sandboxed iframe, separate from the BLINK application origin.
- Three interactive starter applications for immediate exploration.
- Iterative AI editing: follow-up prompts include the current project source, so refinements update the selected project rather than generating unrelated output.
- Desktop/mobile sandboxed previews, a multi-file source editor, copy, save, delete, standalone HTML download, and ZIP source-bundle export.
- Local draft storage for starter projects before cloud services are configured.
- Basic security response headers and request/output size validation.

## Requirements

- Node.js 20.9 or later
- A Supabase project
- An OpenAI API key, or credentials for an OpenAI-compatible API

## Local setup

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in the Supabase project URL, anon key, service-role key and AI provider key. Keep server-only keys private. Never prefix the service-role key or AI key with `NEXT_PUBLIC_`.
4. Apply the SQL migrations in `supabase/migrations/` in filename order to the Supabase project using the Supabase SQL Editor or Supabase CLI. This creates the tables, row-level security, quota enforcement and project-storage limits.
5. In Supabase Authentication settings, configure the allowed site URL and email-confirmation policy appropriate for your deployment.
6. Run `npm run dev`, then open http://localhost:3000.
7. Before deploying, configure the same environment variables in your hosting provider and set the correct production auth redirect URLs.

## Environment

| Variable | Used by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public key; database access remains constrained by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Calls the protected atomic usage-quota RPC |
| `OPENAI_API_KEY` | Server only | AI provider credential |
| `OPENAI_BASE_URL` | Server only | Optional OpenAI-compatible API base URL |
| `OPENAI_MODEL` | Server only | Model name, default `gpt-4.1-mini` |

## Security notes

- The API requires a valid Supabase access token and checks it with Supabase Auth.
- The AI API key and Supabase service-role key are never included in browser code.
- The quota RPC can only be executed by the service role.
- Project rows are protected by user-scoped RLS policies.
- Prompt length, generated HTML size, output files and upstream timeouts are bounded.
- Generated HTML receives a restrictive Content Security Policy; previews run in a sandboxed iframe without `allow-same-origin`.
- The preview blocks network requests and form submission by default. Generated features that need a real backend must be connected to a separately secured service.
- This implementation is an MVP foundation, not a finished production service. Before public launch, add deployment-specific monitoring, billing controls, abuse reporting, automated integration/security tests, production observability, and a separately secured runtime for backend-dependent generated apps.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

## Important

A successful repository commit does not configure cloud credentials or deploy the app by itself. Add environment variables and apply the SQL migration before using authenticated generation in a deployed environment.
