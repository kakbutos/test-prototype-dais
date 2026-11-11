/**
 * Проверяет Node, версии основных зависимостей и их расположение внутри проекта;
 * сообщает об отсутствующих конфигах MCP. Запуск: setup, Actions или npm run doctor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { root, requireNode } from './lib.mjs';

try {
  requireNode();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const name of ['@daisforge/ui', '@daisforge/ui-mcp', 'react', 'styled-components']) {
    const folder = path.join(root, 'node_modules', name);
    const actual = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8')).version;
    const expected = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
    if (actual !== expected) throw new Error(`${name}: ожидалась ${expected}, установлена ${actual}. Запустите npm run setup.`);
    const relative = path.relative(root, fs.realpathSync(folder));
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${name} ссылается за пределы проекта: требуется независимая npm-установка.`);
    console.log(`✓ ${name}@${actual}`);
  }
  for (const file of ['.codex/config.toml', '.mcp.json', '.gigacode/settings.json', '.gigacode_vsc/gigacode.jsonc']) {
    if (!fs.existsSync(path.join(root, file))) console.log(`○ ${file}: создаётся командой npm run setup`);
  }
  console.log('✓ Зависимости установлены локально. Исходники Dais не требуются.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
