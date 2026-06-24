import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Component specs (templateUrl/styleUrl) are handled by `ng test`.
    // Vitest runs service/util specs and server-side logic only.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/app/app.spec.ts',            // root component (templateUrl) → ng test
      'src/app/**/*.component.spec.ts', // component specs → ng test
    ],
  },
});
