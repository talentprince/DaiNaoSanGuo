import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const platform = process.argv[2];
if (!['web-mobile', 'wechatgame'].includes(platform)) {
    console.error('用法：node scripts/build.mjs web-mobile|wechatgame');
    process.exit(1);
}
const creator = process.env.COCOS_CREATOR_PATH || '/Applications/Cocos/Creator/3.8.8/CocosCreator.app';
const executable = creator.endsWith('.exe') ? creator : process.platform === 'darwin'
    ? join(creator, 'Contents/MacOS/CocosCreator') : join(creator, 'CocosCreator.exe');
if (!existsSync(executable)) {
    console.error('未找到 Creator 3.8.8，请设置 COCOS_CREATOR_PATH。');
    process.exit(1);
}
mkdirSync(join(root, 'temp'), { recursive: true });
const log = join(root, 'temp', `build-${platform}.log`);
const handle = openSync(log, 'w');
console.log(`正在构建 ${platform}；请先保存并关闭同一工程的编辑器。日志：${log}`);
const result = spawnSync(executable, ['--project', root, '--build',
    `configPath=${join(root, 'build-configs', `${platform}.json`)}`], { cwd: root, stdio: ['ignore', handle, handle] });
closeSync(handle);
if (result.error) console.error(result.error.message);
// Creator 官方规定 36 表示构建成功，32/34 为构建失败。
const files = platform === 'wechatgame' ? ['game.js', 'game.json', 'project.config.json'] : ['index.html', 'application.js'];
if (result.status !== 36 || files.some(file => !existsSync(join(root, 'build', platform, file)))) {
    console.error(`构建未通过（Creator退出码 ${result.status}），请检查日志：${log}`);
    process.exit(1);
}
console.log(`构建成功：${join(root, 'build', platform)}（Creator退出码36）`);
if (platform === 'wechatgame') console.log('当前使用官方测试AppID，未执行上传、发布、开发者工具或真机验证。');
