// modules/toggle.js
/**
 * 玉子市场 - 悬浮按钮模块
 * @version 2.8.6
 *
 * 负责：按钮创建、样式应用、拖拽移动、点击开关窗口
 */

import { ICONS, themes } from './constants.js';
import { initEventListenerManager } from './state.js';
import { getSettings, saveSetting } from './settings.js';
import { shouldShowToggleButton } from './toggle-visibility-core.js';
import {
    isMobileDevice,
    getDefaultTogglePosition,
    constrainPosition,
    applyButtonStyles,
} from './utils.js';
import { toggleWindow } from './window.js';

const TOGGLE_ID = 'tamako-market-toggle';
const DRAG_THRESHOLD = 5;
const CLICK_THRESHOLD_MS = 300;

export function createToggleButton() {
    const existing = document.getElementById(TOGGLE_ID);
    if (existing) {
        const $existing = $(existing);
        applyToggleButtonVisibility(getSettings(), $existing);
        return $existing;
    }

    const settings = getSettings();
    const isMobile = isMobileDevice();
    const savedTheme = settings.theme || 'night';

    const button = document.createElement('div');
    button.id = TOGGLE_ID;
    button.className = `tamako-toggle theme-${savedTheme === 'custom' ? 'custom' : 'night'} ${isMobile ? 'tamako-toggle-mobile' : ''}`;
    button.innerHTML = `<span class="tamako-toggle-icon">${ICONS.store}</span><span class="tamako-toggle-text">玉子市场</span>`;
    button.title = '拖拽移动 / 点击打开';
    document.body.appendChild(button);

    const $button = $(button);
    applyTogglePosition($button, settings);
    applyToggleTheme($button, settings);
    applyToggleButtonVisibility(settings, $button);
    initToggleDraggable($button);

    return $button;
}

export function removeToggleButton() {
    document.getElementById(TOGGLE_ID)?.remove();
}

export function applyToggleButtonVisibility(settings = getSettings(), $button = $(`#${TOGGLE_ID}`)) {
    if (!$button?.length) {
        return;
    }

    const shouldShow = shouldShowToggleButton(settings);
    $button.toggle(shouldShow);

    if (!shouldShow) {
        $button.removeClass('active has-new dragging');
    }
}

function applyTogglePosition($button, settings) {
    const defaultPosition = getDefaultTogglePosition();

    $button.css({
        left: (settings.toggleX ?? defaultPosition.x) + 'px',
        top: (settings.toggleY ?? defaultPosition.y) + 'px',
        right: 'auto',
        bottom: 'auto',
    });
}

function applyToggleTheme($button, settings) {
    if (settings.theme === 'custom' && settings.customTheme) {
        $button.css({
            '--theme-primary': settings.customTheme.colors.primary,
            '--theme-secondary': settings.customTheme.colors.secondary,
        });
        applyButtonStyles(settings.customTheme, $button);
        return;
    }

    const preset = themes.night;
    $button.css({
        '--theme-primary': preset.primary,
        '--theme-secondary': preset.secondary,
    });
    applyButtonStyles({
        colors: {
            primary: preset.primary,
            secondary: preset.secondary,
        },
        buttonShape: 'bar',
        buttonSize: 1.0,
        buttonImage: null,
    }, $button);
}

function initToggleDraggable($toggle) {
    const button = $toggle[0];
    const manager = initEventListenerManager();
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let offsetX = 0;
    let offsetY = 0;
    let pointerId = null;

    function onContextMenu(event) {
        event.preventDefault();
    }

    function onPointerDown(event) {
        startTime = Date.now();
        hasMoved = false;
        pointerId = event.pointerId;

        const rect = button.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        startX = event.clientX;
        startY = event.clientY;

        button.setPointerCapture(event.pointerId);
        $toggle.addClass('dragging');
        event.preventDefault();
    }

    function onPointerMove(event) {
        if (event.pointerId !== pointerId) {
            return;
        }

        if (
            Math.abs(event.clientX - startX) > DRAG_THRESHOLD ||
            Math.abs(event.clientY - startY) > DRAG_THRESHOLD
        ) {
            hasMoved = true;
        }

        if (!hasMoved) {
            return;
        }

        const nextX = event.clientX - offsetX;
        const nextY = event.clientY - offsetY;
        const constrained = constrainPosition(nextX, nextY, button.offsetWidth, button.offsetHeight);

        button.style.left = constrained.x + 'px';
        button.style.top = constrained.y + 'px';
        event.preventDefault();
    }

    function onPointerUp(event) {
        if (event.pointerId !== pointerId) {
            return;
        }

        try {
            button.releasePointerCapture(event.pointerId);
        } catch (error) {
            // 某些浏览器或异常取消场景下可能无法释放，静默处理即可
        }

        $toggle.removeClass('dragging');

        if (hasMoved) {
            saveSetting('toggleX', parseInt(button.style.left, 10));
            saveSetting('toggleY', parseInt(button.style.top, 10));
        }

        if (!hasMoved && Date.now() - startTime < CLICK_THRESHOLD_MS) {
            toggleWindow();
        }

        hasMoved = false;
        pointerId = null;
    }

    button.addEventListener('contextmenu', onContextMenu);
    button.addEventListener('pointerdown', onPointerDown);
    button.addEventListener('pointermove', onPointerMove);
    button.addEventListener('pointerup', onPointerUp);
    button.addEventListener('pointercancel', onPointerUp);

    manager.register(button, 'contextmenu', onContextMenu);
    manager.register(button, 'pointerdown', onPointerDown);
    manager.register(button, 'pointermove', onPointerMove);
    manager.register(button, 'pointerup', onPointerUp);
    manager.register(button, 'pointercancel', onPointerUp);
}
