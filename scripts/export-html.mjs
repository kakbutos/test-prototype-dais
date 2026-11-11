/**
 * Собирает только выбранный экран в один HTML без галереи и других вариантов.
 * Запуск: npm run export:html -- <slug>. Единственный вариант выбирается автоматически.
 */
import path from 'node:path';
import { root, run } from './lib.mjs';
import { selectPrototype } from './prototypes.mjs';
import { checkHtml } from './check-html.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length > 1) throw new Error('Укажите один ID: npm run export:html -- <slug>');
  const slug = selectPrototype(root, args[0]);
  run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit']);
  run(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'offline'], {
    env: { ...process.env, DAIS_PROTOTYPE: slug },
  });
  checkHtml(path.join(root, 'dist-html', slug));
} catch (error) { console.error(error.message); process.exitCode = 1; }
