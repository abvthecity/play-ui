# play-ui

A pnpm + Turborepo monorepo: packages in `packages/*`, the docs site in `apps/docs`, and
private build tooling in `tools/*` (`tools/tsdown-config` holds the shared tsdown config).
`pnpm check` runs lint, format check, typecheck, tests and build; run it before pushing.

## Tests

- A test lives next to the module it covers, never in a separate `test/` folder:
  `src/spring.ts` is tested by `src/spring.test.ts`.
- A test imports its module relatively (`./spring.ts`). A test of the public API as a
  whole imports `../index.ts`.
- Browser tests (Vitest browser mode) end in `.browser.test.tsx`; everything else ends in
  `.test.ts` and runs in Node.
- Tests never ship: tsdown builds only what `src/index.ts` reaches, and `files` publishes
  only `dist`.
