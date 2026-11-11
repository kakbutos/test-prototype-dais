/** Список вариантов и проверка ID для создания и автономного экспорта. */
import fs from 'node:fs';
import path from 'node:path';
export const validSlug = slug => typeof slug === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 60;
export function listPrototypes(projectRoot) {
  return fs.readdirSync(path.join(projectRoot, 'src/prototypes'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && validSlug(entry.name) && fs.existsSync(path.join(projectRoot, 'src/prototypes', entry.name, 'index.tsx')))
    .map(entry => entry.name).sort();
}
export function selectPrototype(projectRoot, slug) {
  const available = listPrototypes(projectRoot);
  if (slug === undefined && available.length === 1) return available[0];
  if (validSlug(slug) && available.includes(slug)) return slug;
  throw new Error(`Укажите один существующий прототип: npm run export:html -- <slug>. Доступны: ${available.join(', ') || 'нет'}`);
}
