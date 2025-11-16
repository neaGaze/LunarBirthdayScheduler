import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env variables regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: false,
    },
    root: 'src',
    envDir: '../', // Look for .env files in project root, not src folder
    build: {
      outDir: '../dist-web',
      target: 'esnext',
    },
    define: {
      __ENV__: JSON.stringify(env),
    },
    optimizeDeps: {
      include: ['nepali-calendar-js'],
    },
  };
});
