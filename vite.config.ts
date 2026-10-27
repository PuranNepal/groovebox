import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/groovebox/',
  test: { include: ['tests/**/*.test.ts'] },
});
