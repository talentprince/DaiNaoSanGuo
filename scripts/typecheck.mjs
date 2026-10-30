import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const creator = process.env.COCOS_CREATOR_PATH || '/Applications/Cocos/Creator/3.8.8/CocosCreator.app';
const candidates = [
    join(root, 'node_modules/typescript/lib/tsc.js'),
    join(creator, 'Contents/Resources/resources/3d/engine/node_modules/typescript/lib/tsc.js'),
    join(creator, 'resources/resources/3d/engine/node_modules/typescript/lib/tsc.js'),
];
const compiler = candidates.find(existsSync);
if (!compiler) {
    console.error('未找到 TypeScript。请用 COCOS_CREATOR_PATH 指向 Creator 3.8.8 应用或安装目录。');
    process.exit(1);
}
if (!existsSync(join(root, 'temp/tsconfig.cocos.json'))) {
    console.error('请先在 Creator 3.8.8 中打开工程，生成类型声明后再运行检查。');
    process.exit(1);
}
const result = spawnSync(process.execPath, [compiler, '--project', join(root, 'tsconfig.json'),
    '--noEmit', '--skipLibCheck', '--strict', '--pretty', 'false'], { cwd: root, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
