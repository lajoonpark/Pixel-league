import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Game assets (images) live in public/assets/ and are served at /assets/...
  // during dev and copied to dist/assets/ during build, matching all runtime
  // image paths in the codebase.
  publicDir: 'public',

  build: {
    // Top-level await in main.js requires ES2022+ modules.
    target: 'es2022',
  },
});
