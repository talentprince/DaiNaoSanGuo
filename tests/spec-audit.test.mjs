import test from 'node:test';import assert from 'node:assert/strict';
import {mainlineTheme,MAINLINE_THEMES,panoramaItems} from '../assets/data/MainlineThemes.ts';
import {cityFortressPresentation} from '../assets/data/EncounterPresentation.ts';
import {BossWarningState} from '../assets/data/BossWarningState.ts';
import {worldBossPresentation} from '../assets/data/BossPresentation.ts';
test('999关分10个百关主题，边界正确，同章场景不跳变',()=>{
 assert.equal(MAINLINE_THEMES.length,10);
 for(let i=0;i<9;i++){assert.equal(mainlineTheme(i*100+1),mainlineTheme(i*100+100));assert.notEqual(mainlineTheme(i*100+100),mainlineTheme(i*100+101));}
 assert.equal(mainlineTheme(999),MAINLINE_THEMES[9]);assert.throws(()=>mainlineTheme(1000));
});
test('越过地景分段边界时，同一世界物件只移动实际距离，不重置或跳到画面另一端',()=>{
 const a=panoramaItems(189.9,190,720),b=panoramaItems(190.1,190,720);
 for(const item of a){const next=b.find(v=>v.index===item.index);if(next){assert.ok(Math.abs((item.x-next.x)-.2)<1e-8);assert.equal(item.seed,next.seed);}}
 assert.ok(a.some(v=>v.x<=-360)&&a.some(v=>v.x>=360));
});
test('攻城远景至近景只改变透视大小，城池锚点始终固定，接战时恢复原比例',()=>{
 let last=0;for(const remaining of [3.3,2.8,2,1,.5,0]){const f=cityFortressPresentation(remaining);assert.equal(f.x,300);assert.equal(f.y,20);assert.ok(f.scale>=last);last=f.scale;}
 assert.equal(cityFortressPresentation(0).scale,1);assert.equal(cityFortressPresentation(3.3).scale,.38);
});
test('Boss红色提示使用独立UI时钟自动消退，打开其他面板立即清除且不会自行重现',()=>{
 const n=new BossWarningState();n.show();assert.ok(n.opacity<255);n.advance(.7);n.advance(.7);assert.equal(n.active,false);assert.equal(n.opacity,0);
 n.show();n.advance(.01,true);assert.equal(n.active,false);n.advance(.2,false);assert.equal(n.active,false);
});
test('世界Boss显著大于我方，长屏增大压迫感，最高头饰仍留在战场内且避开顶部伤害文字',()=>{
 for(const h of [1108,1370,1550])for(const id of ['world-dongzhuo','world-zhangjiao','world-menghuo']){
  const p=worldBossPresentation(h,id);assert.ok(p.heroScale>=1);assert.ok(p.scale/p.heroScale>=2.9);
  const head=(id==='world-zhangjiao'?92:82)*1.2*p.scale+p.y;assert.ok(head<h/2-48);
 }
});
