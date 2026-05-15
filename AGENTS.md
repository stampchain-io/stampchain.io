# stampchain.io Agent Guidelines

This document summarizes standards, development practices, and style
conventions for working on the stampchain.io code base. The
repository hosts a Deno Fresh web application and REST API. Follow
these guidelines for consistent code quality and project maintenance.
Detailed rules for linting, formatting, workflow commands, and more
reside in the `.cursor/rules` directory. Referencing those files helps
avoid duplication and keeps this guide concise.

## 1. Project Overview
- **Framework**: Fresh (v1.7.3)
- **Deno version**: 2.6.9
- **Purpose**: Serve a Bitcoin Stamps block explorer and API
  supporting SRC‑20, SRC‑721, and SRC‑101 standards.

## 2. Directory Structure
- `routes/` – Fresh routes, API endpoints, and middleware.
  - `_app.tsx` – root app layout.
  - `_404.tsx` – custom 404 page.
  - `_middleware.ts` – root middleware.
  - `api/` – API endpoints (e.g., `api/v2`, `api/internal`).
- `islands/` – Interactive UI components hydrated on the client.
  - Pill segmented controls use [`SelectorButtons`](components/button/doc.md) (`CSS calc` for the sliding pill; cursor inheritance on radio + label). Art Stamps type tabs (`StampOverviewHeader`, URL `type`) align with `FrontendStampType` in [`lib/constants/stampConstants.ts`](lib/constants/stampConstants.ts) and [`islands/filter/FilterOptionsStamp.tsx`](islands/filter/FilterOptionsStamp.tsx).
- `components/` – Server‑side Preact components and layouts.
- `lib/` – Shared utilities, hooks, and type definitions.
- `server/` – Backend services, controllers, database logic, and
  configuration.
- `static/` – Static assets and CSS files.
- `utils/` – Helper scripts and one‑off utilities.
- `tests/` – Unit and integration tests grouped by feature.

## 3. Development Workflow
- **Start development server**: `deno task dev`
- **Run linting**: `deno task check:lint`
- **Run formatting checks**: `deno task check:fmt` (use `deno fmt` to fix issues)
- **Run type checks**: `deno task check:types`
- **Build production bundle**: `deno task build`
- **Start production server**: `deno task start`
- **Generate API docs**: `deno task docs`
- **Validate OpenAPI schema**: `deno task validate:schema`
- **Run Newman API tests**: `deno task test:api`
- **Update Fresh**: `deno task update`

Use `deno task dev:safe` to clean up before running the dev server.

## 4. Environment and Configuration
- `DENO_ENV` determines the runtime environment (`development` or
  `production`).
- `SKIP_REDIS_CONNECTION` skips Redis initialization when true
  (automatically enabled during build and in dev tasks).
- Production uses AWS ElastiCache; configure
  `ELASTICACHE_ENDPOINT`, `CACHE`, and related variables as shown in
  `REDIS_SETUP.md`.
- Development defaults to `https://dev.stampchain.io`; production to
  `https://stampchain.io`.

## 5. Import Conventions
- Use import maps defined in `deno.json`.
- Prefer JSR imports when available (e.g., `@std/*`).
- Project modules use `$` aliases such as `$server/`, `$routes/`,
  `$components/`, `$islands/`, `$lib/`, `$types/`, etc.
- NPM packages use the `npm:` prefix.

## 6. Code Style
- Two‑space indentation and 80‑character line width.
- Use spaces, not tabs.
- Double quotes for strings (see `deno.json` formatting options).
- Write concise TypeScript and favor functional composition.
- Components should use function declarations and explicit props
  interfaces.
- Descriptive variable names (e.g., `isLoading`, `hasError`), with
  SRC20‑related components prefixed `SRC20*`.

## 7. Code Quality
- Run `deno task check:lint` and `deno task check:fmt` before committing.
- Additional tasks:
  - `check:types` – type checking.
- Excluded paths: `server/`, `_fresh/`, `node_modules/`, `dist/`, and
  other generated files (see `deno.json`).
- CI runs `deno task check:fmt` and `deno task check:lint` with Reviewdog to
  annotate formatting and lint issues and executes `actionlint` to validate
  GitHub Actions workflows.

## 8. Testing
- Use the built‑in Deno test runner.
- Example tasks:
  - `deno task test:version` – versioning tests.
  - `deno task test:src20` – SRC‑20 API tests.
  - `deno task test:src20:watch` – watch mode for SRC‑20 tests.
- Newman integration tests are defined via Postman collections and run through Docker.

## 9. Error Handling & Security
- Use Fresh error boundaries for UI errors and return appropriate HTTP
  status codes in API handlers.
- Implement CSRF protection and sanitize user input through the
  `SecurityService` utilities.
- Apply security headers and proper CORS configuration in middleware.
- Follow OWASP guidelines for API endpoints. Rate limiting and API
  version headers are recommended.

## 10. State Management
- Prefer server‑side state and Preact signals.
- Use islands sparingly for client state; isolate local state in small
  islands and share data through Fresh context when necessary.

## 11. Performance Practices
- Fresh streaming and partial hydration are enabled.
- Tailwind CSS is configured via `fresh.config.ts` with custom theme
  extensions (see `tailwind.config.ts`).
- Use caching via Redis or the in‑memory fallback in
  `server/database/databaseManager.ts`.
- Optimize assets (WebP images, lazy loading) and use the caching
  strategy defined in `server/services/cacheService.ts`.

## 12. Emoji Handling
- API routes accept emoji ticks in multiple formats (emoji, Unicode
  escape, or URL encoded).
- The repository layer converts ticks to Unicode for DB operations and
  back to emoji for API responses.
- Always store ticks in Unicode escape format in the database.

## 13. SRC‑20 Optimization Plan
- Maintain backward compatibility for existing SRC‑20 routes while
  implementing optimized versions (see `src20_optimization.mdc`).
- New functions should be added alongside existing ones until tested
  and validated.
- Comprehensive unit and integration tests are required for new
  optimizations.

## 14. Commit and Pull Request Guidelines
- Run `deno task check:lint` and `deno task check:fmt` and relevant tests before committing.
- Ensure OpenAPI schema (`schema.yml`) stays in sync with API changes.
- Provide clear commit messages and reference related tasks or issues
  when applicable.

By following these guidelines and referencing the rules under
`.cursor/rules`, contributors can maintain a consistent codebase and
ensure high‑quality releases of the BTC Stamps Explorer.
