import test from 'node:test';import assert from 'node:assert/strict';import {AudioDirector} from '../assets/battle/AudioDirector.ts';
function setup(saved='on'){const channels=[];let value=saved,now=1000;const factory=()=>{const c={src:'',loop:false,volume:0,currentTime:0,played:0,stopped:0,paused:0,destroyed:0,play(){this.played++},pause(){this.paused++},stop(){this.stopped++},destroy(){this.destroyed++}};channels.push(c);return c;};return{a:new AudioDirector(factory,{getItem:()=>value,setItem:(_,v)=>value=v},()=>now),channels,value:()=>value,advance:n=>now+=n};}
test('背景音乐首次交互后播放，换场景切换曲目，相同场景不重启',()=>{const {a,channels:c}=setup();a.scene('main');assert.equal(c[0].played,0);a.unlock();assert.equal(c[0].played,1);a.scene('main');assert.equal(c[0].played,1);a.scene('boss');assert.equal(c[0].src,'audio/boss.mp3');assert.equal(c[0].loop,true);assert.equal(c[0].played,2);});
test('全局静音保存，关闭后背景/技能均不播放，重新开启恢复',()=>{const {a,channels:c,value}=setup();a.scene('main');a.unlock();a.toggle();assert.equal(value(),'off');const before=c.reduce((n,s)=>n+s.played,0);a.effect('fire');assert.equal(c.reduce((n,s)=>n+s.played,0),before);a.toggle();assert.equal(value(),'on');assert.ok(c[0].played>1);assert.equal(setup('off').a.enabled,false);});
test('技能双声道加独立命中/警报声道，同种去重，终结技压低音乐后恢复',()=>{const {a,channels:c,advance}=setup();a.scene('boss');a.unlock();a.effect('fire');a.effect('fire');assert.equal(c.slice(1).reduce((n,s)=>n+s.played,0),1);advance(200);for(const kind of ['heal','wind','poison','finale'])a.effect(kind);assert.equal(c.length,5);a.update(.1);assert.equal(c[0].volume,.11);a.update(3);assert.equal(c[0].volume,.28);assert.ok(c.slice(1).every(s=>s.stopped>0));});
test('切后台停止音效并暂停背景，恢复后接着播放；销毁只释放一次',()=>{const {a,channels:c}=setup();a.scene('main');a.unlock();a.hide();const before=c[0].played;a.effect('heal');a.show();assert.equal(c[0].played,before+1);a.destroy();a.destroy();assert.ok(c.every(s=>s.destroyed===1));a.unlock();assert.equal(c[0].played,before+1);});
test('九种场景分别选曲且同场景不重启，普攻两种变体并限制密集播放',()=>{
 const {a,channels:c,advance}=setup();a.unlock();
 for(const scene of ['menu','main','city','trial','boat','mainboss','boss','boss-zhangjiao','boss-menghuo']){a.scene(scene);assert.equal(c[0].src,`audio/${scene}.mp3`);}
 a.effect('hit-slash');const first=c[3].src;a.effect('hit-bow');assert.equal(c[3].played,1);advance(300);a.effect('hit-slash');assert.notEqual(c[3].src,first);
 a.effect('fire');advance(200);const count=c.slice(1).reduce((n,s)=>n+s.played,0);a.effect('hit-slash');assert.equal(c.slice(1).reduce((n,s)=>n+s.played,0),count+1);a.update(.3);advance(200);a.effect('hit-bow');assert.ok(c.slice(1).reduce((n,s)=>n+s.played,0)>count+1);
});
test('分包未加载不设置音频路径也不播放，加载成功恢复音乐并只播放一次登场提示',()=>{
 const {a,channels:c}=setup();a.setReady(false);a.scene('boss');a.unlock();a.effect('boss-arrive');a.effect('fire');assert.equal(c[0].src,'');assert.ok(c.every(s=>s.played===0));a.setReady(true);assert.equal(c[0].src,'audio/boss.mp3');assert.equal(c[4].src,'audio/boss-arrive.mp3');const played=c[4].played;a.setReady(true);assert.equal(c[4].played,played);
});
test('加载期间静音会清掉待播放警报，销毁后分包回调不会重新开启声音',()=>{
 const {a,channels:c}=setup();a.setReady(false);a.scene('mainboss');a.unlock();a.effect('boss-arrive');a.toggle();a.setReady(true);assert.ok(c.every(s=>s.played===0));a.destroy();a.setReady(true);assert.ok(c.every(s=>s.played===0));
});

test('场景往返保留音乐进度，浏览器返回绝对src时后台恢复不重置曲目',()=>{
 const {a,channels:c}=setup();let src='',sets=0;
 Object.defineProperty(c[0],'src',{get:()=>src,set:v=>{src='http://127.0.0.1:8765/'+v;sets++;c[0].currentTime=0;}});
 a.scene('main');a.unlock();c[0].currentTime=12;a.hide();a.show();assert.equal(sets,1);assert.equal(c[0].currentTime,12);
 a.scene('mainboss');c[0].currentTime=3;a.scene('main');assert.equal(c[0].currentTime,12);assert.equal(sets,3);
});

test('测试档默认只关背景音乐，分包就绪、切场景和后台恢复都保留静音音乐', () => {
    const channels = [];
    const director = new AudioDirector(() => {
        const channel = { src: '', loop: false, volume: 0, plays: 0, play() { this.plays++; }, pause() {} };
        channels.push(channel);
        return channel;
    }, { getItem: key => key === 'dainaosanguo.audio.v1' ? 'on' : null, setItem() {} }, () => 1000, false, {
        musicDefault: false, musicKey: 'dainaosanguo.music.test.v1',
    });
    director.scene('main');
    director.unlock();
    director.setReady(true);
    director.effect('hit-slash');
    director.scene('boss');
    director.hide();
    director.show();
    director.retry();
    assert.equal(channels[0].src, '');
    assert.equal(channels[0].plays, 0);
    assert.equal(channels[3].plays, 1);
    director.effect('boss-arrive');
    assert.equal(channels[4].plays, 1);
});
test('主动打开测试档音乐会保存，常规档的音乐设置独立', () => {
    const values = new Map();
    const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const make = (profile, musicDefault) => new AudioDirector(() => ({ src: '', loop: false, volume: 0, play() {}, pause() {} }),
        store, Date.now, true, { musicDefault, musicKey: `dainaosanguo.music.${profile}.v1` });
    const test = make('test', false);
    assert.equal(test.musicEnabled, false);
    test.toggleMusic();
    assert.equal(make('test', false).musicEnabled, true);
    make('standard', true).toggleMusic();
    assert.equal(make('test', false).musicEnabled, true);
    assert.equal(make('standard', true).musicEnabled, false);
});
