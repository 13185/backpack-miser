import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({ base: './', plugins: [viteSingleFile()], build: { outDir: 'dist-single', chunkSizeWarningLimit: 5000 } });
