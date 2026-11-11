/** Проверяет один автономный HTML выбранного варианта; вызывается экспортом. */
import fs from 'node:fs';
import path from 'node:path';
export function checkHtml(output) {
  const files = fs.readdirSync(output);
  if (files.length !== 1 || files[0] !== 'index.html') {
    throw new Error(`Экспорт содержит дополнительные файлы: ${files.join(', ')}. Встройте ресурсы в HTML.`);
  }
  const file = path.join(output, 'index.html');
  const size = fs.statSync(file).size;
  console.log(`Готово: ${file} (${(size / 1024 / 1024).toFixed(2)} МБ). Передайте этот один файл. Откройте его в браузере для просмотра.`);
  return { file, size };
}
