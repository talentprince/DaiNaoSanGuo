import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';import {join,relative} from 'node:path';import {createHash} from 'node:crypto';
export function sourceIdentity(root){
 const source=readFileSync(join(root,'assets/data/BuildInfo.ts'),'utf8');const version=/version:'([^']+)'/.exec(source)?.[1],revision=/revision:'([^']+)'/.exec(source)?.[1];if(!version||!revision)throw Error('BuildInfo版本未配置');
 const hash=createHash('sha256');function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const f=join(dir,item.name);if(item.isDirectory())walk(f);else if(item.name!=='.DS_Store'){hash.update(relative(root,f));hash.update(readFileSync(f));}}}
 walk(join(root,'assets'));walk(join(root,'audio'));return{version,revision,sourceHash:hash.digest('hex')};
}
export function stampBuild(root,dir,platform){const value={...sourceIdentity(root),platform,builtAt:new Date().toISOString()};writeFileSync(join(dir,'build-info.json'),JSON.stringify(value,null,2)+'\n');return value;}
export function matchesSource(root,dir){const f=join(dir,'build-info.json');if(!existsSync(f))return false;const built=JSON.parse(readFileSync(f,'utf8')),source=sourceIdentity(root);return built.version===source.version&&built.revision===source.revision&&built.sourceHash===source.sourceHash;}
