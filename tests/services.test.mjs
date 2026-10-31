import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalSession } from '../assets/battle/LocalSession.ts';
import { RUNTIME_CONFIG, BackendNotReadyError } from '../assets/data/RuntimeConfig.ts';
import { createHandler } from '../server/app.mjs';
import { BOSS_ROTATION_EPOCH, BOSS_WEEK_MS } from '../assets/data/WorldBossConfig.ts';

const storage = () => { const data = new Map(); return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
test('默认本地，本机测试档与常规档资源完全隔离，模式选择重启后保留', () => {
    const disk = storage(), session = new LocalSession(disk, '127.0.0.1');
    assert.equal(RUNTIME_CONFIG.serviceMode, 'local');
    assert.equal(session.initial().developerMode, true);
    assert.equal(session.initial().progress.heroLevel, 300);
    session.remember('normal');
    const normal = new LocalSession(disk, '127.0.0.1').initial();
    assert.equal(normal.developerMode, false); assert.equal(normal.progress.heroLevel, 1); assert.equal(normal.progress.daibi, 0);
    session.test(true); assert.equal(session.normal().progress.heroLevel, 1);
    assert.equal(session.test().progress.heroLevel, 300);
});
test('远程/真机不能被已存测试标记提升；云端未接入时阻止启动且零读写，不回落本地发奖', () => {
    const disk = storage(), local = new LocalSession(disk, 'localhost'); local.remember('test');
    const phone = new LocalSession(disk, 'game.example.com');
    assert.equal(phone.initial().developerMode, false);
    assert.throws(() => phone.test(), /仅限/); assert.throws(() => phone.configure({ level: 300, stars: 6, stage: 999 }), /仅限/);
    let touched = false;
    assert.throws(() => new LocalSession({ getItem() { touched = true; return null; }, setItem() { touched = true; } }, 'localhost', false, { serviceMode: 'cloud' }), BackendNotReadyError);
    assert.equal(touched, false);
});
function request(url, method = 'GET', origin, now = BOSS_ROTATION_EPOCH) {
    let body; const headers = {}; const res = { statusCode: 200, setHeader(k, v) { headers[k] = v; }, end(v) { body = JSON.parse(v); } };
    createHandler(() => now)({ url, method, headers: { origin } }, res);
    return { code: res.statusCode, headers, body };
}
test('本地后端返回有版本的服务器时间/三周轮换快照，经济与账号能力明确未开启', () => {
    const first = request('/v1/bootstrap'); assert.equal(first.code, 200); assert.equal(first.body.apiVersion, 1);
    assert.ok(first.body.configVersion); assert.equal(first.body.serverTime, BOSS_ROTATION_EPOCH);
    assert.equal(first.body.worldBoss.current.id, 'dongzhuo'); assert.equal(first.body.worldBoss.rotation.length, 3);
    assert.equal(request('/v1/bootstrap', 'GET', undefined, BOSS_ROTATION_EPOCH + BOSS_WEEK_MS).body.worldBoss.current.id, 'zhangjiao');
    assert.ok(Object.values(first.body.capabilities).every(v => v === false)); assert.equal(first.headers['Cache-Control'], 'no-store');
});
test('后端原型拒绝写入、未知路由和外站来源，不暴露凭据或接收本地存档', () => {
    assert.equal(request('/v1/bootstrap', 'POST').code, 405);
    assert.equal(request('/v1/profile').code, 404);
    assert.equal(request('/v1/bootstrap', 'GET', 'https://unrelated.example').code, 403);
    const r = request('/v1/bootstrap', 'GET', 'http://127.0.0.1:8765');
    assert.equal(r.headers['Access-Control-Allow-Origin'], 'http://127.0.0.1:8765');
    assert.equal(JSON.stringify(r.body).includes('secret'), false);
});
