import { readFileSync,writeFileSync,readdirSync,statSync,mkdirSync,copyFileSync,rmSync,existsSync } from 'node:fs';
import { join,resolve,relative } from 'node:path';
export function prepareAudioTemplate(root,platform){
    const target=join(root,'build-templates',platform,'audio');
    // Only this script's generated, ignored audio directory is replaced.
    rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});
    for(const file of readdirSync(join(root,'audio')))if(file.endsWith('.mp3'))copyFileSync(join(root,'audio',file),join(target,file));
    if(platform==='wechatgame')writeFileSync(join(target,'game.js'),'// Original local audio subpackage. No runtime code.\n');
}
export function finalizeAudioPackage(build){
    const file=join(build,'game.json'),game=JSON.parse(readFileSync(file,'utf8'));
    game.subpackages=(game.subpackages||[]).filter(p=>p.name!=='battle-audio'&&p.root.replace(/\/$/,'')!=='audio');
    game.subpackages.push({name:'battle-audio',root:'audio/'});
    writeFileSync(file,JSON.stringify(game,null,2)+'\n');
}
export function packageSizes(build){
    const game=JSON.parse(readFileSync(join(build,'game.json'),'utf8'));
    const packages=(game.subpackages||[]).map(p=>({name:p.name||p.root,root:p.root.replace(/\/$/,''),bytes:0}));
    for(const p of packages){if(!p.root||p.root.startsWith('/')||p.root.split('/').includes('..')||!existsSync(join(build,p.root,'game.js')))throw new Error('分包入口或路径无效');}
    let mainBytes=0,totalBytes=0;
    function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const file=join(dir,item.name);if(item.isDirectory())walk(file);else if(!['.DS_Store','project.private.config.json'].includes(item.name)){
        const bytes=statSync(file).size;totalBytes+=bytes;const path=relative(build,file).replaceAll('\\','/');const pack=packages.find(p=>path.startsWith(p.root+'/'));if(pack)pack.bytes+=bytes;else mainBytes+=bytes;
    }}}
    walk(resolve(build));return{mainBytes,totalBytes,packages};
}
