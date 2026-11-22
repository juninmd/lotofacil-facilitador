# AGENTS.md

Lotofácil Facilitador: a web app (Vite, React, TypeScript, Tailwind) that generates and analyzes number sets for the Lotofácil lottery: generators, statistics, and Monte Carlo simulation.

> **Regra de ouro:** Estatística existe pra dizer o possível, a matemática para fazer o impossível.

## Stack

- Vite, React, TypeScript, Tailwind, Bootstrap; TensorFlow.js for the model-based generators.
- Vitest for unit tests and the backtest. ESLint with `eslint.config.js`.
- pnpm (`pnpm-lock.yaml`).

## Commands

```bash
pnpm install
pnpm dev                 # Vite dev server
pnpm build               # tsc -b && vite build
pnpm lint                # eslint .
pnpm test                # vitest run
pnpm test:coverage       # vitest run --coverage
pnpm test:backtest       # vitest run --config vitest.backtest.config.ts
pnpm data:update         # node scripts/fetch_history.mjs (updates the history data)
npx vitest run --config vitest.backtest.config.ts src/utils/weekly   # weekly benchmark, writes docs/benchmarks/
```

## Structure

- `src/utils/weekly/`: weekly benchmark. `contenders.ts` exports `candidateContenders`, where new ideas are tested.
- `src/utils/mc/`: Monte Carlo simulation.
- `docs/LEARNINGS.md`: results of past weekly rounds, with numbers.
- `docs/benchmarks/`: output of the weekly benchmark.
- `scripts/`: data update (`fetch_history.mjs`) and verification scripts.
- `.Jules/palette.md`: notes kept by the Jules agent. Read it before UI work.
- `.github/workflows/`: `pages.yml` (GitHub Pages), `validate.yml` (base-actions), `sast.yml`, `security.yml`, `release-drafter.yml`.

## Weekly improvement round (required for agents)

1. Read `docs/LEARNINGS.md` first. Do not repeat what already failed.
2. Update the history (`node scripts/fetch_history.mjs`), then run the benchmark command above. It writes `docs/benchmarks/`.
3. Test new ideas in `src/utils/weekly/contenders.ts` (`candidateContenders`). Promote an idea to the app only if it has z ≥ 2 **and** z ≥ 1 in each half (old and recent) of the long backtest. Picking the best of many variants on one sample is overfitting. Confirm on a separate period.
4. Record what worked and what failed in `docs/LEARNINGS.md`, with numbers, and open a PR.

## Conventions

- Each file has at most 180 lines of code.
- Write tests before the implementation. Cover edge cases and error conditions. Mock the agent's logic in tests.
- Target at least 80% coverage for functions and classes. The Vitest config does not enforce a threshold.
- Document the why of the code, not the what. Document assumptions and dependencies.
- Keep the README current with setup and usage.
- Commit in small, focused changes. Follow the existing commit style in `git log`.
- Principles: DRY, KISS, YAGNI, SOLID. Build only what the task requires.

## Gotchas

- Every push to `master` deploys to GitHub Pages (`pages.yml`). Merging to `master` is a publish.
- The README says the build uses `--base=/lotofacil-facilitador/`, but `package.json` and `vite.config.ts` do not set it. Check the Pages base before relying on it.
- `scripts/verify_*.ts` are standalone checks that no script or workflow runs. Run them by hand.

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.
