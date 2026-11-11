/**
 * Общие функции для служебных скриптов: путь к проекту, запуск команд и npm, проверка Node.
 * Импортируется другими модулями; отдельно запускать не требуется.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.error) throw new Error(`${command}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${command} завершился с кодом ${result.status}`);
  return result.stdout?.trim();
}
export function npm(args) {
  // npm_execpath avoids .cmd shell quoting differences on Windows.
  return process.env.npm_execpath
    ? run(process.execPath, [process.env.npm_execpath, ...args])
    : run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { shell: process.platform === 'win32' });
}
export function requireNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (!((major === 22 && minor >= 14) || major >= 24)) {
    throw new Error(`Нужен Node 22.14+ (22.x) или 24+. Установлен ${process.version}. См. README.`);
  }
}
