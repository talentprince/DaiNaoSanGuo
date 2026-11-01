import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {finalizeAudioPackage,packageSizes} from '../scripts/audio-package.mjs';
test('音频分包后主包统计排除音频，入口保留、合计准确，重复处理不重复声明',()=>{
 const root=mkdtempSync(join(tmpdir(),'dainaosanguo-pack-'));try{
  mkdirSync(join(root,'audio'));writeFileSync(join(root,'audio/game.js'),'');writeFileSync(join(root,'audio/main.mp3'),Buffer.alloc(220));writeFileSync(join(root,'game.js'),Buffer.alloc(50));writeFileSync(join(root,'game.json'),'{}');writeFileSync(join(root,'project.private.config.json'),Buffer.alloc(999));
  finalizeAudioPackage(root);finalizeAudioPackage(root);const game=JSON.parse(readFileSync(join(root,'game.json')));assert.equal(game.subpackages.length,1);assert.equal(game.subpackages[0].name,'battle-audio');
  const result=packageSizes(root);assert.equal(result.packages[0].bytes,220);assert.equal(result.totalBytes,result.mainBytes+220);assert.ok(result.mainBytes<220);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('分包配置缺失game.js或尝试越出构建目录时拒绝通过预检',()=>{
 const root=mkdtempSync(join(tmpdir(),'dainaosanguo-pack-'));try{
  writeFileSync(join(root,'game.json'),JSON.stringify({subpackages:[{name:'bad',root:'audio/'}]}));assert.throws(()=>packageSizes(root),/入口或路径/);
  writeFileSync(join(root,'game.json'),JSON.stringify({subpackages:[{name:'bad',root:'../other/'}]}));assert.throws(()=>packageSizes(root),/入口或路径/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
