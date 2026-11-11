/**
 * Через GitHub CLI проверяет Pages (publish:check), настраивает его (publish:setup)
 * или ждёт публикацию текущего коммита (publish:wait). Сам не выполняет commit и push.
 */
import { spawnSync } from 'node:child_process';
import { root } from './lib.mjs';

function gh(args) {
  const result = spawnSync('gh', args, { cwd: root, encoding: 'utf8' });
  if (result.error) throw new Error('Установите GitHub CLI: https://cli.github.com/');
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Ошибка GitHub CLI');
  return result.stdout.trim();
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  const mode = process.argv[2] ?? 'check';
  if (!['check', 'setup', 'wait'].includes(mode)) throw new Error('Используйте check, setup или wait.');
  gh(['auth', 'status']);
  const repo = JSON.parse(gh(['repo', 'view', '--json', 'nameWithOwner,defaultBranchRef,url']));
  if (repo.defaultBranchRef?.name !== 'main') throw new Error('Workflow шаблона настроен на main. Согласуйте default branch и .github/workflows/pages.yml.');
  console.log(`Репозиторий: ${repo.url}`);
  let pages;
  try { pages = JSON.parse(gh(['api', `repos/${repo.nameWithOwner}/pages`])); }
  catch (error) {
    if (!error.message.includes('404')) throw error;
    if (mode !== 'setup') throw new Error('GitHub Pages ещё не включён. По запросу пользователя запустите npm run publish:setup.');
    pages = JSON.parse(gh(['api', '--method', 'POST', `repos/${repo.nameWithOwner}/pages`, '-f', 'build_type=workflow']));
  }
  if (pages.build_type !== 'workflow') {
    if (mode !== 'setup') throw new Error('В Settings → Pages выберите Source: GitHub Actions.');
    pages = JSON.parse(gh(['api', '--method', 'PUT', `repos/${repo.nameWithOwner}/pages`, '-f', 'build_type=workflow']));
  }
  console.log(`GitHub Pages: ${pages.html_url}`);
  if (mode === 'wait') {
    const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
    if (git.status !== 0) throw new Error('Не удалось определить локальный commit.');
    const sha = git.stdout.trim();
    let success = false;
    for (let i = 0; i < 120; i++) {
      const runs = JSON.parse(gh(['run', 'list', '--workflow', 'pages.yml', '--commit', sha, '--event', 'push', '--limit', '1', '--json', 'status,conclusion,url']));
      const current = runs[0];
      if (current?.status === 'completed') {
        if (current.conclusion !== 'success') throw new Error(`Публикация: ${current.conclusion}. ${current.url}`);
        console.log(`✓ Actions: ${current.url}`); success = true; break;
      }
      if (i % 6 === 0) console.log('Ожидаем сборку и публикацию текущего commit…');
      await sleep(5000);
    }
    if (!success) throw new Error('Сборка ещё не завершена за 10 минут. Повторите publish:wait; новый deploy не запускается.');
    let reachable = false;
    for (let i = 0; i < 12; i++) {
      const response = await fetch(pages.html_url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) { reachable = true; break; }
      await sleep(5000);
    }
    if (!reachable) throw new Error('Actions завершён, но страница пока не отвечает успешно. Проверьте URL Pages.');
    console.log(`✓ Опубликовано и доступно: ${pages.html_url}`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
