import { defineConfig, normalizePath, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPrototype } from './scripts/prototypes.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
// Исходные макеты — материалы агента, не ресурсы приложения.
function referenceGuard(): Plugin {
  const references = normalizePath(path.join(root, '.references')) + '/';
  const check = (id: string) => {
    const file = id.split('?')[0];
    const resolved = fs.existsSync(file) ? fs.realpathSync(file) : file;
    if (normalizePath(resolved).startsWith(references)) {
      throw new Error('Исходные PNG из .references нельзя импортировать в приложение. Используйте их только для визуальной сверки.');
    }
  };
  return {
    name: 'exclude-design-references', enforce: 'pre',
    load(id) { check(id); return null; },
    generateBundle() { for (const file of this.getWatchFiles()) check(file); },
  };
}
function singlePrototype(slug: string): Plugin {
  const virtualId = 'virtual:dais-prototype';
  return {
    name: 'single-prototype',
    resolveId(id) { if (id === virtualId) return '\0' + virtualId; },
    load(id) {
      if (id === '\0' + virtualId) {
        return `export { default, meta } from ${JSON.stringify(normalizePath(path.join(root, 'src/prototypes', slug, 'index.tsx')))};`;
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) { return html.replace('/src/main.tsx', '/src/standalone.tsx'); },
    },
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  const slug = offline ? selectPrototype(root, process.env.DAIS_PROTOTYPE) : undefined;
  return {
    plugins: [referenceGuard(), react(), ...(slug ? [singlePrototype(slug), viteSingleFile()] : [])],
    base: './',
    // public/ копируется без обработки: автономный экспорт использует только импорты ресурсов.
    publicDir: offline ? false : 'public',
    build: slug ? { outDir: `dist-html/${slug}`, emptyOutDir: true } : undefined,
  };
});
