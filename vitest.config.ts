import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src-tauri/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@flowforge/types': path.resolve(__dirname, 'shared/types/src'),
      '@flowforge/canvas': path.resolve(__dirname, 'packages/canvas/src'),
      '@flowforge/state': path.resolve(__dirname, 'packages/state/src'),
    },
  },
});
