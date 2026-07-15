// modules/state.js
/**
 * 玉子市场 - 状态管理
 * @version 2.8.6
 */

import { createEventListenerManager } from './events.js';

// ===== 类型定义 =====

/**
 * @typedef {Object} CapturedPlot
 * @property {string} content - 捕获的内容
 * @property {string} rawMessage - 原始消息
 * @property {'qrf_plot'|'mes'} sourceKind - 权威来源类型
 * @property {number} timestamp - 时间戳
 * @property {number} messageIndex - 消息索引
 */

/**
 * @typedef {Object} ResizeState
 * @property {boolean} isResizing
 * @property {string} handle
 * @property {number} startX
 * @property {number} startY
 * @property {number} startWidth
 * @property {number} startHeight
 * @property {HTMLElement|null} element
 * @property {number|null} pointerId
 */

/**
 * @typedef {Object} DragState
 * @property {boolean} isDragging
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {number|null} pointerId
 */

/**
 * @typedef {Object} PickerState
 * @property {string|null} colorKey
 * @property {number} hue
 * @property {number} saturation
 * @property {number} lightness
 */

// ===== 全局状态 =====

/** @type {CapturedPlot[]} */
export let capturedPlots = [];

/** @type {boolean} */
export let deleteMode = false;

/** @type {boolean} */
export let extensionEnabled = true;

/** @type {string} */
export let searchQuery = '';

/** @type {string} */
export let currentTheme = 'tamako';

/** @type {boolean} */
export let isThemeEditorOpen = false;

/** @type {boolean} */
export let isEyedropperActive = false;

/** @type {string|null} */
export let currentEditingColor = null;

/** @type {Object|null} */
export let tempCustomTheme = null;

// ===== 模板缓存 =====

/** @type {string|null} */
export let cachedTemplate = null;

/** @type {string} */
export let cachedTemplateSource = '';

/** @type {string|null} */
export let cachedTemplateId = null;

// ===== 定时器 =====

/** @type {number|null} */
export let validateDebounceTimer = null;

/** @type {number|null} */
export let beautifierLoadTimeout = null;

// ===== 事件追踪 =====

/** @type {MutationObserver|null} */
export let mutationObserver = null;

/** @type {EventListenerManager|null} 事件监听器管理器 */
export let eventListenerManager = null;

// 拖拽状态
export let resizeState = {
    isResizing: false,
    handle: '',
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    element: null,
    pointerId: null
};

export let dragState = {
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    pointerId: null
};

// 调色盘状态
export let pickerState = {
    colorKey: null,
    hue: 0,
    saturation: 100,
    lightness: 50
};

// ===== Getter 函数 =====
export function getCapturedPlots() {
    return capturedPlots;
}

export function getDeleteMode() {
    return deleteMode;
}

export function getSearchQuery() {
    return searchQuery;
}

export function getCachedTemplateId() {
    return cachedTemplateId;
}

// ===== 状态更新函数 =====
export function setCapturedPlots(plots) {
    capturedPlots = plots;
}

export function setDeleteMode(mode) {
    deleteMode = mode;
}

export function setExtensionEnabled(enabled) {
    extensionEnabled = enabled;
}

export function setSearchQuery(query) {
    searchQuery = query;
}

export function setCurrentTheme(theme) {
    currentTheme = theme;
}

export function setThemeEditorOpen(open) {
    isThemeEditorOpen = open;
}

export function setEyedropperActive(active) {
    isEyedropperActive = active;
}

export function setCurrentEditingColor(color) {
    currentEditingColor = color;
}

export function setTempCustomTheme(theme) {
    tempCustomTheme = theme;
}

export function setCachedTemplate(template, source, templateId = null) {
    cachedTemplate = template;
    cachedTemplateSource = source;
    cachedTemplateId = templateId;
}

export function clearTemplateCache() {
    cachedTemplate = null;
    cachedTemplateSource = '';
    cachedTemplateId = null;
}

export function setValidateDebounceTimer(timer) {
    validateDebounceTimer = timer;
}

export function setBeautifierLoadTimeout(timeout) {
    beautifierLoadTimeout = timeout;
}

export function updateResizeState(updates) {
    Object.assign(resizeState, updates);
}

export function updateDragState(updates) {
    Object.assign(dragState, updates);
}

export function updatePickerState(updates) {
    Object.assign(pickerState, updates);
}

export function resetResizeState() {
    resizeState = {
        isResizing: false,
        handle: '',
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        element: null,
        pointerId: null
    };
}

export function resetDragState() {
    dragState = {
        isDragging: false,
        offsetX: 0,
        offsetY: 0,
        pointerId: null
    };
}

// ===== 事件管理器初始化 =====

/**
 * 初始化事件监听器管理器
 * @returns {EventListenerManager}
 */
export function initEventListenerManager() {
    if (!eventListenerManager) {
        eventListenerManager = createEventListenerManager();
    }
    return eventListenerManager;
}

/**
 * 获取事件监听器管理器
 * @returns {EventListenerManager|null}
 */
export function getEventListenerManager() {
    return eventListenerManager;
}

// ===== 事件追踪函数 =====

/**
 * 设置 MutationObserver
 * @param {MutationObserver|null} observer
 */
export function setMutationObserver(observer) {
    mutationObserver = observer;
}

/**
 * 断开 MutationObserver
 */
export function disconnectObserver() {
    if (mutationObserver) {
        try {
            mutationObserver.disconnect();
        } catch (e) {
            // 忽略错误
        }
        mutationObserver = null;
    }
}

/**
 * 清理所有资源（统一清理入口）
 * 包括：事件监听器、MutationObserver、定时器等
 */
export function cleanupAllResources() {
    // 1. 使用统一事件管理器清理
    if (eventListenerManager) {
        eventListenerManager.clearAll();
        eventListenerManager = null;
    }

    // 2. 断开 MutationObserver
    disconnectObserver();

    // 3. 清理定时器
    if (validateDebounceTimer) {
        clearTimeout(validateDebounceTimer);
        validateDebounceTimer = null;
    }
    if (beautifierLoadTimeout) {
        clearTimeout(beautifierLoadTimeout);
        beautifierLoadTimeout = null;
    }

    console.log('[玉子市场] 资源清理完成');
}
