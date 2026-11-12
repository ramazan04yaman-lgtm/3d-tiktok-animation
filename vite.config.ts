import { defineConfig } from 'vite';
import { simulationApi } from './server/apiPlugin.ts';

export default defineConfig({
  base: './',
  plugins: [simulationApi(process.env.SIM_FILE)],
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
});
