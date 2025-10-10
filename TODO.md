# TODO

## Package upgrades
| Package | Current | Target | Notes |
| --- | --- | --- | --- |
| @sveltejs/kit | ^2.5.20 | ^2.7.x (latest 2.x) | Required for Cloudflare adapter and new auth helpers |
| svelte | ^4.2.18 | ^5.x | Decide whether to adopt runes or opt out |
| @sveltejs/vite-plugin-svelte | ^3.1.1 | ^4.x | Works with Svelte 5 + Vite 5/6 |
| Custom toast module | n/a | n/a | Replaced Skeleton toast usage with in-house component |
| @skeletonlabs/tw-plugin | ^0.4.0 | ^1.x | Matches Skeleton v3 and Tailwind 3.4+ |
| @supabase/ssr | ^0.4.0 | ^1.x | Cookie API changed to get/set/remove helpers |
| @supabase/supabase-js | ^2.45.0 | ^2.latest | Peer dependency for ssr 1.x |
| @tiptap/*, tiptap-unique-id | ^2.5.8 | ^2.6+/^3.0 | Extension reworks and command renames |
| tailwindcss | ^3.4.7 | ^3.4.latest (prep for 4) | Config export changes soon |
| typescript | ^5.5.4 | ^5.6.x | Needed for newer Kit + ESLint types |
| vite | ^5.3.5 | ^5.4+/6.0 | Update config/test integration |
| vitest | ^2.0.5 | ^2.latest | Align with Vite upgrade |
| @playwright/test | ^1.45.3 | ^1.48.x | webServer helper tweaks |
| eslint | ^9.8.0 | ^9.latest | Flat config improvements |
| @typescript-eslint/* | ^8.0.0 | ^8.latest | Required by ESLint 9 |

_Group ancillary dev deps (prettier, eslint-plugin-svelte, @types/*, tailwind plugins, autoprefixer, tslib) with the primary bumps after the main upgrades compile._

## Required code refactors

### Supabase SSR & auth flow
- `src/hooks.server.ts`: update `createServerClient` usage to the v1 cookies contract (`cookies: () => event.cookies` or `{ get, set, remove }`), guard `safeGetSession` with try/catch, throw `error(401)` on token failures, and stop returning the Supabase client from handlers.
- `src/routes/+layout.server.ts`: return only primitive session/user data; remove the `cookies.getAll()` serialisation.
- `src/routes/+layout.ts`: construct the Supabase browser client lazily in the browser branch, expose only serialisable data (`session`, `userId`), and keep `depends('supabase:auth')` for invalidation.
- `src/routes/+layout.svelte`: rewrite reactive assignments using Svelte 5 `$props`/`$effect` (or opt out of runes) and wire the new Supabase client handling accordingly.
- `src/app.d.ts`: import `SupabaseClient` from `@supabase/ssr`, mark `locals.session`/`locals.user` as optional, and add any new platform typings required by the updated adapter.

### SvelteKit & Skeleton upgrades
- `svelte.config.js`: enable runes (`runes: true`) or explicitly disable them, upgrade `@sveltejs/adapter-cloudflare`, and re-run `svelte-kit sync` after dependency changes.
- `src/routes/+layout.svelte` & `src/routes/admin/+layout.svelte`: replace `initializeStores`/`Toast` with the Skeleton v3 provider components (`<SkeletonProvider>`, `<SkeletonToast>`), and move any browser-only initialisation into `onMount` guards.
- `tailwind.config.js`: adopt the new Skeleton Tailwind plugin signature, ensure the `content` globs cover the dist files, and prepare for Tailwind 4’s `defineConfig` export if planning that upgrade.
- `postcss.config.js`: keep the minimal Tailwind/Autoprefixer stack; remove unused plugins once Tailwind 4 is introduced.

### Rich text editor stack (Tiptap)
- `src/lib/components/editor/Tiptap.svelte`: update extension imports/commands for the latest Tiptap release, guard DOM access with `if (browser)`, and ensure the toolbar commands use the renamed APIs.
- `src/lib/components/editor/CustomCodeBlock.ts`: rewrite the extension using `Extension.create` with the new attribute hooks and keep `data-language` rendering intact.
- `src/lib/functions/createEditor.ts`: instantiate the updated `Editor` from `@tiptap/core` (or migrate to `@tiptap/svelte`) and keep the readable store wrapper.
- `src/lib/components/editor/EditorContent.svelte`: drop manual DOM node swapping; rely on the official editor content component or adapt to the new hydration hooks.
- Review toolbar/Images modal components to ensure command signatures and attribute shapes still match the upgraded extensions.

### Tooling & testing
- `vite.config.ts`: update to Vite 5.4+/6 syntax, add any required `server.pretransformRequests`/`optimizeDeps` flags for Cloudflare deployment, and refresh the Vitest block with the new options (`coverage.provider`, `environment: 'jsdom'`, etc.).
- `tsconfig.json`: align with the generated SvelteKit config—remove redundant `moduleResolution` overrides if Vite supplies them, add `"types": ["vite/client"]` when needed, and keep `strict` true.
- `playwright.config.ts`: use the updated `preview` service helper (`use: { baseURL }`) or rely on `testDir` + `fullyParallel`; ensure the build step still works with Vite 5/6.
- `eslint.config.js`: expand the flat config to include `eslint-plugin-svelte` v3 and the Svelte-specific recommended config; wire `typescript-eslint` shared settings as required by ESLint 9.
- `package.json`: adjust scripts if Vite/Kit introduce new commands (e.g., `svelte-kit sync` prebuild) and add a dedicated script for Playwright headed runs if needed.

### Deployment & environment
- `pnpm-lock.yaml`: regenerate after dependency bumps.
- `README.md`: document the new setup commands (`pnpm install`, `pnpm run lint`, etc.) and Svelte 5 rune decision.
- Environment variables: confirm Cloudflare worker bindings still line up with the Supabase upgrade (cookie handling + session refresh).

## Suggested upgrade sequence
1. Create a new branch and bump core packages (`@sveltejs/kit`, `svelte`, `@sveltejs/vite-plugin-svelte`, Supabase packages). Regenerate `pnpm-lock.yaml`.
2. Update Supabase auth wiring (`src/hooks.server.ts`, `src/routes/+layout*.ts|svelte`, typings) and verify SSR builds.
3. Upgrade Skeleton/Tailwind related packages, refactor layouts, and rebuild Tailwind configuration.
4. Upgrade the editor stack (Tiptap packages + related components) and confirm content serialization still round-trips.
5. Refresh tooling configs (Vite/Vitest/Playwright/ESLint/TypeScript) and update scripts/docs.
6. Run the full test suite (`pnpm run lint`, `pnpm run check`, `pnpm run test`, `pnpm run test:integration`) and fix any regressions before merging.

## Validation checklist
- `pnpm install`
- `pnpm run lint`
- `pnpm run check`
- `pnpm test`
- `pnpm run test:integration` (Playwright)
- `pnpm run build`
- Manual QA of Supabase auth flows (login/logout, token refresh) and editor features (table ops, image insert, cover selection).

## Notes
- Follow upstream changelogs (SvelteKit, Skeleton, Supabase, Tiptap) while upgrading; some APIs may still be stabilising.
- If Svelte 5 runes are disabled, add `runes: false` in `svelte.config.js` and adjust new components accordingly.
- Defer Tailwind 4 adoption until the ecosystem catches up, but keep the config ready for a future follow-up.
