/**
 * Копирует навыки из .agents/skills в папки Claude и GigaCode.
 * Запускается при setup или командой npm run skills:sync.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './lib.mjs';

export function syncSkills(projectRoot) {
  for (const name of ['dais-setup', 'dais-prototype', 'dais-publish', 'dais-export-html']) {
    const source = path.join(projectRoot, '.agents/skills', name);
    for (const client of ['.claude', '.gigacode']) {
      fs.cpSync(source, path.join(projectRoot, client, 'skills', name), { recursive: true });
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) syncSkills(root);
