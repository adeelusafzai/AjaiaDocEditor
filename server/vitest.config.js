import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The integration suite talks to a real Postgres, so keep files serial.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 40_000,
  },
});
