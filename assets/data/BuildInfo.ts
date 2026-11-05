export const BUILD_INFO={version:'0.16.0',revision:'r16a'} as const;
export function buildCaption(preview:boolean,native:boolean):string {
    return `v${BUILD_INFO.version} · ${BUILD_INFO.revision} · ${preview?'Cocos源码':native?'微信构建':'Web构建'}`;
}
