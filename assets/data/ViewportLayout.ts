export interface ViewportInsets { top: number; bottom: number; }
/** UI coordinates after FIXED_WIDTH; world art fills the complete canvas. */
export function viewportLayout(width: number, height: number, insets: ViewportInsets = { top: 0, bottom: 0 }) {
    if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('窗口尺寸无效');
    const top = Math.max(0, Math.min(height * .2, insets.top || 0));
    const bottom = Math.max(0, Math.min(height * .2, insets.bottom || 0));
    const scale = Math.min(1, (height - top - bottom) / 1280);
    const extra = Math.max(0, ((height - top - bottom) / scale - 1280) / 2);
    return { width, height, scale, centerY: (bottom - top) / 2, topOffset: extra, bottomOffset: -extra,
        fieldWidth: Math.max(704, width / scale), fieldHeight: 1108 + extra * 2 };
}
