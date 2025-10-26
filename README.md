# Shinano CMS

Shinano CMS is an internal SvelteKit admin console for managing multilingual articles, books, photos, and short-form thoughts that live inside a Supabase project. It ships with an opinionated content model, a Tiptap-based editor, role-gated Supabase Auth, and helper APIs backed by Cloudflare Workers for tasks such as tagging, translation, slug generation, and image alt text.

## Highlights
- SvelteKit + Tailwind UI tuned for `/admin` workflows (articles, categories, media, comments, etc.) with Supabase SSR session handling.
- Supabase SQL schema and storage conventions that support multiple languages, advanced metadata, and relationships between content types.
- Rich text editing via Tiptap plus media, cover selection, and localized drafts.
- Cloudflare Worker integrations triggered through `/api/*` routes for AI-assisted authoring tasks (summaries, keywords, translations, slugs).
- Ready-to-run Playwright + Vitest suites, ESLint, Prettier, and `svelte-check` for CI quality gates.

## Project Layout
- `src/routes/admin/*` – authenticated admin pages per content type (article, book, media, comments, settings, users, etc.).
- `src/routes/api/*` – server endpoints that proxy to Cloudflare Workers or Supabase helpers (slug checks, alt text, kv, tags).
- `src/lib` – shared UI components (e.g., `ArticleEditor`), Supabase browser client, stores, and helper utilities such as i18n.
- `src/migration/init.sql` – canonical Supabase schema (tables, enums, indexes) for Shinano content.
- `static` – assets served verbatim by SvelteKit.

## Requirements
- Node.js 20+ (see `.nvmrc` for the pinned version).
- `pnpm` (recommended via `corepack enable`) or npm.
- A Supabase project with database access and a storage bucket for uploaded media.
- A Cloudflare Worker (or similar HTTP service) that accepts tagging/translation/image requests.

## Setup
1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Environment variables**

   Create `.env.local` (SvelteKit loads it automatically) and provide the secrets listed below. The `PUBLIC_` prefix marks values that are safe to expose to the browser; everything else stays private.

   | Variable | Scope | Purpose |
   | --- | --- | --- |
   | `PUBLIC_SUPABASE_URL` | public | Supabase project URL. |
   | `PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key used by the browser client. |
   | `URL_PREFIX` | server | Base URL used when rendering media links inside the admin. |
   | `BASE_URL` | server | Public-facing site URL used when linking out from comments. |
   | `WORKERS_URL` | server | Origin for Cloudflare Worker endpoints consumed by `/api/*`. |
   | `WORKERS_TOKEN` | server | Authorization token forwarded to the Worker. |

3. **Database**
   - Provision a Supabase project and enable the `uuid-ossp` extension (required for UUID helpers).
   - Run `src/migration/init.sql` in the Supabase SQL editor or with `psql`:
     ```bash
     psql "$SUPABASE_DB_URL" -f src/migration/init.sql
     ```
   - Optionally seed media buckets that match the `image` table records or update the admin to create them on demand.

4. **Supabase Auth**
   - Create at least one admin user in Supabase Auth.
   - Map the Supabase `auth.users.id` to the `users` table with role `admin` so that `/admin` routes stay accessible.

5. **Cloudflare Worker**
   - Deploy a Worker that exposes the paths consumed inside `src/routes/api` (e.g., `/slug`, `/img-alt`, `/tags`, `/translation`, `/abstract`).
   - Issue an API token and configure `WORKERS_URL` / `WORKERS_TOKEN`.

## Development Workflow
- `pnpm dev` – start the SvelteKit dev server on `localhost:5173`.
- `pnpm dev -- --open` – start and auto-open the browser.
- The admin login flow lives at `/auth/login`; successful auth redirects to `/admin`.
- When editing articles, use the breadcrumb actions to duplicate language variants; `/admin/article/new?from=<id>&lang=<langId>` preloads existing content.

## Build & Deploy
- `pnpm build` compiles the project with `@sveltejs/adapter-cloudflare`, producing output ready for Cloudflare Pages/Workers.
- `pnpm preview` serves the built output locally for smoke testing.
- Deploy with `wrangler` or the Cloudflare Pages UI by pointing at the repo and ensuring the environment variables above are configured in the target environment.

## Testing & Quality Gates
- `pnpm test` runs both suites; use `pnpm test:unit` (Vitest) or `pnpm test:integration` (Playwright) individually.
- `pnpm check` executes `svelte-check` with the repo TS config.
- `pnpm lint` ensures code style through Prettier and ESLint.
- `pnpm format` applies Prettier when you need to reformat files.

With the environment variables set and the Supabase schema applied, the `/admin` area becomes fully functional for content editors. Use the provided scripts whenever you add new migrations or API endpoints so the admin stays in sync with your Supabase project.
