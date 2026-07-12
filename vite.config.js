import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: '/ai-options-story/',
  plugins: [react(), vue()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:43128',
    },
  },
});
