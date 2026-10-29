import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { optimizeArt } from './scripts/optimize_art.mjs';

function phoneArt(): Plugin {
  return {
    name: 'phone-art',
    apply: 'build',
    async buildStart() {
      await optimizeArt();
    },
    closeBundle() {
      const art = path.resolve('dist/art');
      if (!fs.existsSync(art)) return;
      for (const name of fs.readdirSync(art)) {
        if (name === 'web') continue;
        fs.rmSync(path.join(art, name), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [phoneArt()],
  build: { chunkSizeWarningLimit: 2000 },
});
