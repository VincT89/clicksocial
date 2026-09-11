import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5180, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8787', '/dev/mail': 'http://127.0.0.1:8787' } },
});
