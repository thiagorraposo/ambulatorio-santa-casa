import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This variable is consumed by Node only; no database or JWT secret enters the bundle.
const apiTarget = process.env.FRONTEND_API_TARGET ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    strictPort: true,
    proxy: { '/v1': { target: apiTarget, changeOrigin: false } },
  },
  preview: { host: '127.0.0.1', strictPort: true },
});
