import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One ~550 kB bundle (React + motion + dnd-kit) is fine for a dashboard; no need to split it.
  build: { chunkSizeWarningLimit: 800 },
  server: { proxy: { '/api': 'http://localhost:3000' } }
});
