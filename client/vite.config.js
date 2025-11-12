import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'buffer'; // Uvozimo Buffer

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Definišemo 'global.Buffer' da bi ga kripto biblioteke pronašle
  define: {
    'global.Buffer': Buffer,
  },
});