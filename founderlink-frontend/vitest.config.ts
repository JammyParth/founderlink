import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration — loaded by @angular/build:unit-test when runnerConfig=true.
 * Only coverage settings are declared here; Angular's builder controls the test
 * environment, globals, and setup files.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['html', 'text', 'text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/environments/**',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
});
