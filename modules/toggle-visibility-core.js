// modules/toggle-visibility-core.js
/**
 * 玉子市场 - 悬浮按钮可见性核心逻辑
 *
 * 目标：把设置态到 UI 可见性的判断抽成纯函数，避免 UI 层到处复制
 * `enabled && !hideToggleButton` 这种脆弱条件。
 */

/**
 * 判断悬浮窗按钮是否应该显示。
 *
 * @param {{ enabled?: boolean, hideToggleButton?: boolean } | null | undefined} settings
 * @returns {boolean}
 */
export function shouldShowToggleButton(settings) {
    return settings?.enabled !== false && settings?.hideToggleButton !== true;
}
