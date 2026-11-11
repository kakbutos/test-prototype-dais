/**
 * Создаёт пустой экран, не затрагивая другие варианты. PNG хранится отдельно от приложения.
 * Запуск: npm run prototype:new -- my-screen "Название" [--reference "/путь/макет.png"].
 */
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib.mjs';
import { validSlug } from './prototypes.mjs';

try {
  const [slug, ...args] = process.argv.slice(2);
  const title = args[0] && !args[0].startsWith('--') ? args.shift() : 'Новый прототип';
  if (!validSlug(slug) || (args.length && (args.length !== 2 || args[0] !== '--reference'))) {
    throw new Error('Использование: npm run prototype:new -- my-screen "Название" [--reference "/путь/макет.png"]. ID: латиница, цифры, дефис; до 60 символов.');
  }
  const folder = path.join(root, 'src/prototypes', slug);
  const referenceFolder = path.join(root, '.references', slug);
  if (fs.existsSync(folder)) throw new Error(`Прототип ${slug} уже существует; выберите новый ID.`);
  let png;
  if (args.length) {
    png = fs.readFileSync(path.resolve(args[1]));
    if (!png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Исходник должен быть PNG.');
    if (fs.existsSync(referenceFolder)) throw new Error(`Исходник ${slug} уже сохранён; выберите другой ID.`);
  }
  fs.mkdirSync(folder, { recursive: true });
  try {
    fs.writeFileSync(path.join(folder, 'index.tsx'), `export const meta = { title: ${JSON.stringify(title)}, description: 'Новый экран по макету', category: 'Черновик' };

export default function Prototype() {
  return <main aria-label={${JSON.stringify(title)}} />;
}
`);
    if (png) {
      fs.mkdirSync(referenceFolder, { recursive: true });
      fs.writeFileSync(path.join(referenceFolder, 'source.png'), png, { flag: 'wx' });
    }
  } catch (error) {
    fs.rmSync(folder, { recursive: true, force: true });
    if (png) fs.rmSync(referenceFolder, { recursive: true, force: true });
    throw error;
  }
  console.log(`Создан пустой экран src/prototypes/${slug}/index.tsx. Адрес: /#/${slug}. Галерея подхватит его автоматически.`);
  if (png) console.log(`Исходный PNG: .references/${slug}/source.png. Он не входит в Git и сборки; не импортируйте его в приложение.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
