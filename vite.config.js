import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: '/ai-options-story/',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:43128',
    },
  },
});
