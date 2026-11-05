import {stampBuild} from './build-identity.mjs';
import {prepareAudioTemplate} from './audio-package.mjs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
prepareAudioTemplate(root,'preview');
console.log(stampBuild(root,resolve(root,'preview-template'),'Cocos源码'));
console.log('Cocos源码预览音频已同步：preview-template/audio；入口 http://localhost:7456/');
