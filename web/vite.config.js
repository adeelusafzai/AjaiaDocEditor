import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API base URL is read at runtime from VITE_API_URL (see src/api/client.js).
// In dev we default to the local API on :4000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
