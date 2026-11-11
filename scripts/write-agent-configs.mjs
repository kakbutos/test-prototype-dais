/**
 * Создаёт или обновляет настройки Dais MCP для Codex, Claude и GigaCode,
 * сохраняя другие настройки. Вызывается при setup; также доступен прямой запуск через node.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function writeAgentConfigs(projectRoot) {
  // Imported after npm ci; the initial setup script itself needs only Node.
  const { parse, stringify } = await import('smol-toml');
  const jsonc = await import('jsonc-parser');
  const launcher = path.join(projectRoot, 'scripts', 'mcp-server.mjs');
  const server = { command: process.execPath, args: [launcher], cwd: projectRoot };
  const tomlFile = path.join(projectRoot, '.codex', 'config.toml');
  const toml = fs.existsSync(tomlFile) ? parse(fs.readFileSync(tomlFile, 'utf8')) : {};
  toml.mcp_servers ??= {};
  toml.mcp_servers['dais-ui'] = server;
  const pending = [[tomlFile, stringify(toml)]];
  for (const rel of ['.mcp.json', '.gigacode/settings.json', '.gigacode_vsc/gigacode.jsonc']) {
    const file = path.join(projectRoot, rel);
    let source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '{}\n';
    const errors = [];
    jsonc.parse(source, errors, { allowTrailingComma: true });
    if (errors.length) throw new Error(`Исправьте синтаксис ${rel}; настройка не перезаписывает повреждённые файлы.`);
    source = jsonc.applyEdits(source, jsonc.modify(source, ['mcpServers', 'dais-ui'], server, { formattingOptions: { insertSpaces: true, tabSize: 2 } }));
    pending.push([file, source]);
  }
  // Parse every existing config before writing any; preserve other servers/settings.
  for (const [file, content] of pending) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  console.log('MCP настроен для Codex, Claude Code, GigaCode CLI и GigaCode VS Code.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { root } = await import('./lib.mjs');
  await writeAgentConfigs(root);
}
