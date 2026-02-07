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
      '@node-core/schema': path.resolve(__dirname, '../node-core/packages/schema/src'),
      '@node-core/registry': path.resolve(__dirname, '../node-core/packages/registry/src'),
      '@node-core/engine': path.resolve(__dirname, '../node-core/packages/engine/src'),
      '@node-core/render': path.resolve(__dirname, '../node-core/packages/render/src'),
    },
  },
});
