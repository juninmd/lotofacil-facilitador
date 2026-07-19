import { defineConfig } from 'vitest/config'

// Dedicated config for the real-data backtest (network-bound, non-deterministic).
// Run with: npm run test:backtest
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.bench.test.ts'],
    testTimeout: 600_000,
  },
})
