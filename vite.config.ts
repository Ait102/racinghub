import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works from any static host sub-path.
  base: './',
  test: {
    environment: 'jsdom', // pure logic tests opt into `// @vitest-environment node` (much faster start)
    pool: 'threads', // measured on Windows: 33 s instead of 41 s with the default forks
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
