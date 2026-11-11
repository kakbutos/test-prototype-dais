/**
 * Проверяет MCP реальным подключением: наличие инструментов, ответы о TableCanvas
 * и соответствие библиотеки. Запуск: setup, Actions или npm run mcp:check.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { root } from './lib.mjs';
import path from 'node:path';
import os from 'node:os';

const client = new Client({ name: 'dais-template-check', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(root, 'scripts/mcp-server.mjs')], cwd: os.tmpdir(), stderr: 'pipe' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  for (const name of ['get_installation_guide', 'get_component', 'list_features', 'get_feature_examples']) {
    if (!tools.some(tool => tool.name === name)) throw new Error(`MCP не предоставляет ${name}`);
  }
  for (const [name, args] of [['get_installation_guide', {}], ['get_component', { name: 'TableCanvas' }], ['list_features', { component: 'TableCanvas' }]]) {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) throw new Error(`${name}: MCP вернул ошибку`);
    const text = JSON.stringify(result);
    if (name === 'list_features' && (!text.includes('Editing') || !text.includes('Searching'))) throw new Error('Индекс MCP не содержит ожидаемые фичи TableCanvas');
    if (text.includes('libNotInstalled":true') || text.includes('dataVersionNotice')) throw new Error('MCP сообщил о несовпадении версии или отсутствии библиотеки');
    console.log(`✓ MCP ${name}`);
  }
  console.log(`✓ ${tools.length} MCP-инструментов сервера, запуск из чужой рабочей папки проверен. Подключение текущего ИИ-клиента эта команда не проверяет.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await client.close(); await transport.close(); }
