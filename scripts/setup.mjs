/**
 * Подготавливает проект: устанавливает зависимости из lockfile, настраивает MCP,
 * синхронизирует навыки и запускает диагностику. Запуск: npm run setup.
 */
import { requireNode, npm, root } from './lib.mjs';
import { writeAgentConfigs } from './write-agent-configs.mjs';
import { syncSkills } from './sync-skills.mjs';

try {
  requireNode();
  console.log('Устанавливаем зависимости из package-lock.json…');
  npm(['ci', '--no-audit', '--no-fund']);
  await writeAgentConfigs(root);
  syncSkills(root);
  npm(['run', 'doctor']);
  npm(['run', 'mcp:check']);
  console.log('\nПодготовка файлов завершена. Перезапустите агент в этой папке для подхвата MCP и навыков, разрешите подключение dais-ui.');
  console.log('mcp:check проверил сервер. Подключение клиента подтвердите вызовом get_component(TableCanvas) из агента. Если навыки не обнаружены, прочитайте .agents/skills напрямую.');
  console.log('Запуск: npm run dev. Запрос агенту: «Собери новый макет по этому PNG».');
} catch (error) { console.error(error.message); process.exitCode = 1; }
