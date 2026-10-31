import { createServer } from 'node:http';
import { createHandler } from './app.mjs';

const port = Number(process.env.DAINAO_BACKEND_PORT || 8787);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('DAINAO_BACKEND_PORT must be 1024–65535');
const server = createServer(createHandler());
server.listen(port, '127.0.0.1', () => console.log(`本地只读后端：http://127.0.0.1:${port}/v1/bootstrap（游戏仍使用本地规则）`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
