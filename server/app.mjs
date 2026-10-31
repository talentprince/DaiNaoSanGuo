import { WORLD_BOSSES, bossRotation } from '../assets/data/WorldBossConfig.ts';

export const CONFIG_VERSION = '0.11.1';
const allowedOrigins = new Set(['http://127.0.0.1:8765', 'http://localhost:8765', 'http://localhost:7456', 'http://127.0.0.1:7456']);

/** No accounts or economy writes. Bind only to loopback in dev-server.mjs. */
export function createHandler(clock = Date.now) {
    return (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        const send = (code, value) => { res.statusCode = code; res.end(JSON.stringify(value)); };
        const origin = req.headers.origin;
        if (origin && !allowedOrigins.has(origin)) return send(403, { error: 'origin_not_allowed' });
        if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
        if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'read_only_prototype' }); }
        const path = new URL(req.url, 'http://127.0.0.1').pathname;
        if (path === '/health') return send(200, { status: 'ok', mode: 'local-prototype' });
        if (path !== '/v1/bootstrap') return send(404, { error: 'not_found' });
        const serverTime = clock();
        const { boss, week, nextAt } = bossRotation(serverTime);
        send(200, {
            apiVersion: 1, configVersion: CONFIG_VERSION, serverTime,
            capabilities: { authentication: false, cloudSave: false, economy: false, ranking: false },
            worldBoss: { current: boss, week, nextAt, rotation: WORLD_BOSSES },
        });
    };
}
