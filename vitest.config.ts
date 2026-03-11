import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'threads',
    testTimeout: 10000,
    reporter: 'verbose',
  },
});
