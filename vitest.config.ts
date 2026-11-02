import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Playwright owns tests/ui; Vitest must never pick those files up.
    exclude: [...configDefaults.exclude, 'tests/ui/**'],
  },
});
