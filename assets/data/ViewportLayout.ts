export interface ViewportInsets { top: number; bottom: number; }
export interface MenuCapsule { left: number; top: number; bottom: number; }

/** All coordinates use the canvas design units after FIXED_WIDTH. */
export function viewportLayout(width: number, height: number, insets: ViewportInsets = { top: 0, bottom: 0 }, capsule?: MenuCapsule) {
    if (![width, height].every(n => Number.isFinite(n) && n > 0)) throw new Error('窗口尺寸无效');
    const safeTop = Math.max(0, Math.min(height * .24, insets.top || 0));
    const menu = capsule && [capsule.left, capsule.top, capsule.bottom].every(Number.isFinite)
        && capsule.left > 0 && capsule.left <= width && capsule.top >= 0 && capsule.bottom > capsule.top
        && capsule.bottom <= height * .24 ? capsule : undefined;
    const top = Math.max(safeTop, menu ? menu.bottom + 8 : 0);
    const bottom = Math.max(0, Math.min(height * .2, insets.bottom || 0));
    const available = height - top - bottom;
    const scale = Math.min(1, width / 720, available / 1280);
    const extra = Math.max(0, (available / scale - 1280) / 2);
    const centerY = (bottom - top) / 2;
    const walletWidth = menu ? (menu.left - 36) / scale : 0;
    const menuCenter = menu ? (menu.top + menu.bottom) / 2 : 0;
    // Put the read-only wallet beside the capsule only when it also clears the notch.
    const walletBesideCapsule = !!menu && walletWidth >= 390 && menuCenter - 16.8 * scale >= safeTop + 2;
    const headerShift = walletBesideCapsule ? 40 : 0;
    const fieldTop = 464 + extra + headerShift;
    const fieldBottom = -640 - extra;
    return {
        width, height, scale, centerY, topOffset: extra, bottomOffset: -extra,
        fieldWidth: width / scale, fieldHeight: fieldTop - fieldBottom, fieldCenter: (fieldTop + fieldBottom) / 2,
        headerBottom: centerY + fieldTop * scale, headerShift,
        wallet: walletBesideCapsule ? {
            x: (menu!.left / 2 - width / 2) / scale,
            y: (height / 2 - menuCenter - centerY) / scale - extra,
            width: walletWidth,
        } : { x: 0, y: 612, width: 690 },
    };
}
