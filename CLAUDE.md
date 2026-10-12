# play-ui

A pnpm + Turborepo monorepo: packages in `packages/*`, the docs site in `apps/docs`, and
private build tooling in `tools/*` (`tools/tsdown-config` and `tools/vitest-config` hold the shared tsdown and Vitest configs).
`pnpm check` runs lint, format check, typecheck, tests and build; run it before pushing.

## Tests

- A test lives next to the module it covers, never in a separate `test/` folder:
  `src/spring.ts` is tested by `src/spring.test.ts`.
- A test imports its module relatively (`./spring.ts`). A test of the public API as a
  whole imports `../index.ts`.
- Browser tests (Vitest browser mode) end in `.browser.test.tsx`; everything else ends in
  `.test.ts` and runs in Node.
- Every package's `vitest.config.ts` calls `defineTestConfig()` from `@play-ui/vitest-config`;
  a package with browser tests passes `{ browser: true }`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`
  to run them against a local Chromium.
- Tests never ship: tsdown builds only what `src/index.ts` reaches, and `files` publishes
  only `dist`.

## Releases

- Changesets drives versioning: a change to a published package ships with a changeset
  (`pnpm changeset`). Private packages (`tools/*`, `apps/docs`) are never versioned or published.
- `.github/workflows/release.yml` opens a "Version Packages" PR from pending changesets and,
  once it merges, publishes to npm through trusted publishing (OIDC) with provenance. Publishing
  runs only while the `NPM_PUBLISH` repository variable is `true`.
