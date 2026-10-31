import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),build=join(root,'build/wechatgame');
const blockers=[],checks=[];let bytes=0,appid='';
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=join(dir,item.name);if(item.isDirectory())walk(file);else if(!['.DS_Store','project.private.config.json'].includes(item.name))bytes+=statSync(file).size;}}
if(!existsSync(join(build,'game.js')))blockers.push('缺少微信构建，请先npm run build:wechat');
else{
 walk(build);const game=JSON.parse(readFileSync(join(build,'game.json'),'utf8')),project=JSON.parse(readFileSync(join(build,'project.config.json'),'utf8'));appid=project.appid||'';
 if(!/^wx[0-9a-f]{16}$/i.test(appid)||appid==='wx6ac3f5090a6b99c5')blockers.push('仍是官方测试AppID或AppID无效：需要自己的小游戏AppID及上传权限');
 if(game.deviceOrientation!=='portrait')blockers.push('game.json不是portrait');
 // Conservative budget, before the platform calculates its actual upload size.
 if(bytes>4000000)blockers.push('本地未压缩体积超过保守4,000,000字节预算，需要分包/裁剪');
 checks.push('入口存在',`本地总量${bytes.toLocaleString()}字节（不等同平台上传统计）`,`方向${game.deviceOrientation}`);
}
const report={readyForUpload:blockers.length===0,appid,bytes,checks,blockers,manualChecks:['后台账号/开发者与体验成员权限','Android/iOS真机触摸、存档、后台恢复与性能','公开发布前按后台核对备案/主体类目资质/隐私/审核材料'],scope:'只读本地技术预检；不登录、不上传、不认证账号与合规资格'};
console.log(JSON.stringify(report,null,2));if(blockers.length)process.exitCode=2;
