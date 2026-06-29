import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  // ADD THIS BLOCK: Forces esbuild to transpile logical assignments inside normal .js files
  esbuild: {
    include: /\.js$/,
    loader: 'js',
    target: 'es2020',
  },
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 6', 'Chrome >= 60'],
      configFile: false,
      babel: {
        presets: [
          [
            '@babel/preset-env',
            {
              modules: false,
              useBuiltIns: 'usage',
              corejs: 3,
            },
          ],
        ],
        plugins: [
          '@babel/plugin-transform-logical-assignment-operators',
        ],
      },
    }),
  ],
  build: {
    minify: false,
    target: 'es2015', // Keeps the main production bundler compiled for compatibility
    cssTarget: 'chrome60',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('react')) return 'vendor';
            if (id.includes('lucide')) return 'ui';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});