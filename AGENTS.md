# Repository Guidelines

## Project structure

Tactiloom turns physical card layouts into executable workflows. `services/vision/` reads board images with FastAPI and OpenCV. In `packages/`, `compiler` converts board states into workflow graphs, `workflow-engine` executes them, and `board-kit` generates the printable cards and boards.

The Next.js UI and HTTP API live in `apps/web/`. The API queues jobs in PostgreSQL for `apps/runner/` to execute. `packages/db/` provides the Prisma client, and `prisma/` holds migrations and seed data. Find printable assets and example documents in `assets/`, and shared test inputs in `tests/fixtures/`.

## Build and local development

Use Node.js 24+, pnpm 11.9.0, and Python 3.12+. For a fresh checkout, copy `.env.example` to `.env`, set the session and vision secrets, and match the PostgreSQL password in both database URLs.

- `docker compose up --build` builds and starts the full stack at `http://localhost:3210`.
- `pnpm install && pnpm vision:setup` installs workspace dependencies and creates the vision virtual environment.
- For local development, run `pnpm db:up && pnpm db:migrate && pnpm db:seed`. Start `./scripts/dev/vision.sh`, `./scripts/dev/runner.sh`, and `./scripts/dev/web.sh dev` in separate terminals.
- `pnpm build` creates the production web build. Run `pnpm typecheck` for strict TypeScript checks and `pnpm lint` for ESLint and Ruff.

## Coding style and contracts

Follow `.editorconfig` with two-space indentation and four spaces in Python. Use PascalCase for React components, camelCase for TypeScript functions, and snake_case for Python functions. When changing a shared vision contract, edit its Zod definition in `packages/contracts/src/`, run `pnpm contracts:schemas`, and update the corresponding Pydantic model.

## Testing guidelines

Add a test for each behavior change. Prioritize compiler, execution, and security cases. Run `pnpm test` for Vitest (`test/*.test.ts` within workspaces) and pytest (`services/vision/tests/test_*.py`). Use fast-check for compiler properties and Hypothesis for vision properties.

Run `pnpm test:integration` with PostgreSQL running and `TEST_DATABASE_URL` pointing to a database ending in `_test`. Run `pnpm test:e2e` for Playwright specs in `tests/e2e/*.spec.ts` against the running stack with system Chrome and ffmpeg installed.

## Commits and pull requests

Use `type(scope): summary`, with an optional subsystem scope such as `compiler` or `vision`. For example, `fix(vision): handle rotated boards`. In pull requests, describe the behavior change, list checks run, link related issues, and include screenshots for visible UI changes.
