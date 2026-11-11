/**
 * Тестирует сохранение настроек при повторном setup, обработку повреждённых конфигов
 * защиту при создании вариантов и изоляцию автономного HTML/исходных PNG. Запуск: npm test, в том числе в GitHub Actions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseToml } from 'smol-toml';
import { parse as parseJsonc } from 'jsonc-parser';
import { writeAgentConfigs } from '../scripts/write-agent-configs.mjs';
import { root } from '../scripts/lib.mjs';
import { selectPrototype } from '../scripts/prototypes.mjs';
import { build } from 'vite';

test('повторная настройка сохраняет другие MCP, настройки и пользовательские макеты', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dais-config-test-'));
  try {
    fs.mkdirSync(path.join(folder, '.codex'), { recursive: true });
    fs.mkdirSync(path.join(folder, 'src/prototypes/custom'), { recursive: true });
    fs.writeFileSync(path.join(folder, 'src/prototypes/custom/index.tsx'), 'user content');
    fs.writeFileSync(path.join(folder, '.codex/config.toml'), 'model = "user-model"\n[mcp_servers.other]\ncommand = "other-server"\n');
    fs.writeFileSync(path.join(folder, '.mcp.json'), '{"mcpServers":{"other":{"command":"other-server"}},"custom":true}');
    await writeAgentConfigs(folder);
    await writeAgentConfigs(folder);
    const toml = parseToml(fs.readFileSync(path.join(folder, '.codex/config.toml'), 'utf8'));
    assert.equal(toml.model, 'user-model');
    assert.equal(toml.mcp_servers.other.command, 'other-server');
    assert.equal(toml.mcp_servers['dais-ui'].cwd, folder);
    const json = parseJsonc(fs.readFileSync(path.join(folder, '.mcp.json'), 'utf8'));
    assert.equal(json.mcpServers.other.command, 'other-server');
    assert.equal(json.custom, true);
    assert.equal(fs.readFileSync(path.join(folder, 'src/prototypes/custom/index.tsx'), 'utf8'), 'user content');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('повреждённые конфиги не приводят к частичной перезаписи', async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dais-bad-config-'));
  try {
    fs.writeFileSync(path.join(folder, '.mcp.json'), '{bad');
    await assert.rejects(writeAgentConfigs(folder), /синтаксис/);
    assert.equal(fs.existsSync(path.join(folder, '.codex/config.toml')), false);
    assert.equal(fs.readFileSync(path.join(folder, '.mcp.json'), 'utf8'), '{bad');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('создание варианта не перезаписывает существующий и не выходит из своей папки', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dais-new-test-'));
  try {
    fs.mkdirSync(path.join(folder, 'scripts'));
    fs.mkdirSync(path.join(folder, 'src/prototypes'), { recursive: true });
    for (const name of ['lib.mjs', 'prototypes.mjs', 'new-prototype.mjs']) fs.copyFileSync(path.join(root, 'scripts', name), path.join(folder, 'scripts', name));
    const run = (...args) => spawnSync(process.execPath, [path.join(folder, 'scripts/new-prototype.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(run('../outside').status, 1);
    assert.equal(run('my-screen', 'Название "с кавычками"').status, 0);
    const file = path.join(folder, 'src/prototypes/my-screen/index.tsx');
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /Collection|TableCanvas/);
    fs.writeFileSync(file, 'user changed');
    assert.equal(run('my-screen').status, 1);
    assert.equal(fs.readFileSync(file, 'utf8'), 'user changed');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});


test('PNG сохраняется отдельно; повреждённый вход и существующий исходник не оставляют новый экран', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dais-reference-test-'));
  try {
    fs.mkdirSync(path.join(folder, 'scripts'));
    for (const name of ['lib.mjs', 'prototypes.mjs', 'new-prototype.mjs']) fs.copyFileSync(path.join(root, 'scripts', name), path.join(folder, 'scripts', name));
    const run = (...args) => spawnSync(process.execPath, [path.join(folder, 'scripts/new-prototype.mjs'), ...args], { encoding: 'utf8' });
    const source = path.join(folder, 'макет формы.png');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(source, png);
    assert.equal(run('form', 'Форма', '--reference', source).status, 0);
    assert.deepEqual(fs.readFileSync(path.join(folder, '.references/form/source.png')), png);
    assert.deepEqual(fs.readdirSync(path.join(folder, 'src/prototypes/form')), ['index.tsx']);
    fs.writeFileSync(source, 'not a png');
    assert.equal(run('invalid', '--reference', source).status, 1);
    assert.equal(fs.existsSync(path.join(folder, 'src/prototypes/invalid')), false);
    fs.writeFileSync(source, png);
    fs.mkdirSync(path.join(folder, '.references/existing'), { recursive: true });
    fs.writeFileSync(path.join(folder, '.references/existing/source.png'), 'original');
    assert.equal(run('existing', '--reference', source).status, 1);
    assert.equal(fs.existsSync(path.join(folder, 'src/prototypes/existing')), false);
    assert.equal(fs.readFileSync(path.join(folder, '.references/existing/source.png'), 'utf8'), 'original');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('экспорт требует выбор при нескольких вариантах и отклоняет неизвестный ID', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dais-select-test-'));
  try {
    fs.mkdirSync(path.join(folder, 'src/prototypes/first'), { recursive: true });
    fs.writeFileSync(path.join(folder, 'src/prototypes/first/index.tsx'), '');
    assert.equal(selectPrototype(folder), 'first');
    fs.mkdirSync(path.join(folder, 'src/prototypes/second'));
    fs.writeFileSync(path.join(folder, 'src/prototypes/second/index.tsx'), '');
    assert.throws(() => selectPrototype(folder), /first, second/);
    assert.throws(() => selectPrototype(folder, '../outside'), /Укажите/);
    assert.throws(() => selectPrototype(folder, 'missing'), /Укажите/);
    assert.equal(selectPrototype(folder, 'second'), 'second');
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
});

test('Vite экспортирует только выбранный модуль и отклоняет исходные PNG в обеих сборках', async () => {
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dais-export-test-')));
  const previous = process.env.DAIS_PROTOTYPE;
  try {
    const put = (name, content) => {
      fs.mkdirSync(path.dirname(path.join(folder, name)), { recursive: true });
      fs.writeFileSync(path.join(folder, name), content);
    };
    put('package.json', '{"type":"module"}');
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(folder, 'node_modules'), 'junction');
    for (const name of ['vite.config.ts', 'index.html', 'scripts/prototypes.mjs']) put(name, fs.readFileSync(path.join(root, name)));
    put('src/main.tsx', "import a from './prototypes/first'; import b from './prototypes/second'; console.log('GALLERY_MARKER', a, b);");
    put('src/standalone.tsx', "import screen from 'virtual:dais-prototype'; console.log(screen);");
    put('src/prototypes/first/index.tsx', "export default 'SELECTED_SCREEN_MARKER'; export const meta = {};");
    put('src/prototypes/second/index.tsx', "export default 'OTHER_SCREEN_MARKER';");
    put('.references/first/source.png', 'SOURCE_PNG_MARKER');
    put('public/unrelated.txt', 'PUBLIC_MARKER');
    put('dist-html/previous/index.html', 'PREVIOUS_EXPORT');
    process.env.DAIS_PROTOTYPE = 'first';
    const compile = mode => build({ root: folder, configFile: path.join(folder, 'vite.config.ts'), mode, logLevel: 'silent' });
    await compile('offline');
    const html = fs.readFileSync(path.join(folder, 'dist-html/first/index.html'), 'utf8');
    assert.match(html, /SELECTED_SCREEN_MARKER/);
    assert.doesNotMatch(html, /OTHER_SCREEN_MARKER|GALLERY_MARKER|SOURCE_PNG_MARKER|PUBLIC_MARKER/);
    assert.deepEqual(fs.readdirSync(path.join(folder, 'dist-html/first')), ['index.html']);
    assert.equal(fs.readFileSync(path.join(folder, 'dist-html/previous/index.html'), 'utf8'), 'PREVIOUS_EXPORT');
    await compile('production');
    const js = fs.readdirSync(path.join(folder, 'dist/assets')).find(name => name.endsWith('.js'));
    assert.match(fs.readFileSync(path.join(folder, 'dist/assets', js), 'utf8'), /OTHER_SCREEN_MARKER/);
    for (const source of [
      "import png from '../../../.references/first/source.png'; export default png; export const meta = {};",
      "import './reference.css'; export default 'screen'; export const meta = {};",
    ]) {
      put('src/prototypes/first/index.tsx', source);
      put('src/prototypes/first/reference.css', "body { background-image: url('../../../.references/first/source.png'); }");
      for (const mode of ['offline', 'production']) await assert.rejects(compile(mode), /Исходные PNG/);
    }
  } finally {
    if (previous === undefined) delete process.env.DAIS_PROTOTYPE; else process.env.DAIS_PROTOTYPE = previous;
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
