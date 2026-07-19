import { defineConfig } from 'vitest/config'

// Homologação: unit tests run in a plain Node environment (no DOM/tfjs needed
// for the deterministic algorithm invariants). Heavy async TF strategies are
// exercised separately by the scripts/verify_*.ts smoke checks.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Backtest hits the live Caixa API (non-deterministic, network-bound) — kept
    // out of the default/CI run; execute it with `npm run test:backtest`.
    exclude: ['**/node_modules/**', '**/*.bench.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts', 'src/game.ts'],
      exclude: ['src/utils/tensorflowStrategy.ts', 'src/utils/neuralNetStrategy.ts', 'src/utils/biLstmStrategy.ts'],
    },
  },
})
