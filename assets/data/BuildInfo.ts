export const BUILD_INFO={version:'0.19.0',revision:'r19a'} as const;
export function buildCaption(preview:boolean,native:boolean):string {
    return `v${BUILD_INFO.version} · ${BUILD_INFO.revision} · ${preview?'Cocos源码':native?'微信构建':'Web构建'}`;
}

export function setBrowserBuildTitle(page: { title: string } | undefined, caption: string, native: boolean): void {
    if (page && !native) page.title = `呆脑三国 · ${caption}`;
}
