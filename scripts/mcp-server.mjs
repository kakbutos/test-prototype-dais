/**
 * Запускает установленный Dais MCP из корня проекта, даже если клиент начал
 * работу в другой папке. Вызывается ИИ-клиентом при подключении MCP и диагностикой.
 */
import { root } from './lib.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
// Resolve from this project, even when an MCP client starts with a different cwd.
process.chdir(root);
await import(pathToFileURL(path.join(root, 'node_modules/@daisforge/ui-mcp/dist/server.js')).href);
