# AGENTS.md

## Purpose

Instructions for AI coding agents working in `9router-lite`.
Keep changes minimal, validate them, and prefer linking to existing docs instead of duplicating architecture details.

## First Read

- Project overview: [`README.md`](./README.md)
- Runtime architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- CLI package details: [`cli/README.md`](./cli/README.md)
- Built-in skill docs: [`skills/README.md`](./skills/README.md)
- Test package notes: [`tests/README.md`](./tests/README.md)

## Key Commands

### Root app

- Dev: `npm run dev`
- Build: `npm run build`
- Start production: `npm start`

### CLI package

Run from `./cli`:

- Dev: `npm run dev`
- Build: `npm run build`

### Tests

Run from `./tests`:

- Test once: `npm test`
- Watch: `npm run test:watch`

## Architecture Map

- Dashboard UI and management APIs: `src/app/(dashboard)/*`, `src/app/api/*`
- OpenAI-compatible API surface: `src/app/api/v1/*`, `src/app/api/v1beta/*`
- Main routing/chat entrypoint: `src/sse/handlers/chat.js`
- Core provider execution and translation: `open-sse/handlers/chatCore.js`
- Provider adapters: `open-sse/executors/*`
- Translation layer: `open-sse/translator/*`
- App persistence: `src/lib/localDb.js`, `src/lib/db/*`
- Usage tracking: `src/lib/usageDb.js`
- Provider/model config: `open-sse/config/*`, `src/shared/constants/*`

## Working Conventions

- Prefer editing existing patterns instead of introducing new abstractions.
- Keep provider-specific logic near `open-sse/executors/*` or provider API routes.
- Keep dashboard UI work inside `src/app/(dashboard)/*` and shared UI in `src/shared/components/*`.
- When changing model/provider behavior, inspect both dashboard routes and `/api/v1/*` compatibility routes.
- Reuse existing bilingual phrasing patterns when touching user-facing docs or dashboard copy.

## Validation Expectations

- After code edits, check editor diagnostics for touched files.
- For app-level changes, prefer validating with `npm run build` from the repo root.
- For CLI-specific changes, also validate `./cli` build when relevant.
- If a change affects tests, use the `./tests` package rather than assuming root test scripts exist.

## Project Pitfalls

- Root app dev/build uses webpack explicitly.
- The dashboard/dev server commonly runs on port `45231`, while the CLI default runtime was customized separately.
- Provider connection state can come from SQLite/Postgres/Cockroach-style values; avoid strict boolean assumptions when reading DB fields.
- Compatible provider base URLs may be entered as full endpoint paths such as `/chat/completions`; normalize before calling `/models` or related endpoints.
- Some runtime behavior spans both `src/*` and `open-sse/*`; search both before refactoring.
- `gitbook/` is a separate docs app. Do not mix its patterns with the main dashboard unless intentionally editing docs UI.

## Change Strategy

1. Read the nearest route/component/module first.
2. Follow existing naming and data-shape conventions.
3. Make the smallest coherent fix.
4. Validate touched files.
5. Link to existing docs instead of copying large explanations into code or instructions.

## When To Read More

Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) before making changes to:

- request routing
- fallback logic
- streaming behavior
- provider execution
- persistence boundaries

Read [`README.md`](./README.md) before changing:

- setup commands
- ports
- install flow
- public-facing feature descriptions
