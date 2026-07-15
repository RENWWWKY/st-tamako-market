// modules/events.js
/**
 * 玉子市场 - 事件系统
 * @version 2.8.6
 *
 * 规范化事件监听，使用 SillyTavern 官方事件类型
 */

/**
 * SillyTavern 标准事件类型映射
 * 参考: sillyTavern酒馆项目架构详细说明+(1).md
 */
export const EventTypes = {
    // 消息相关事件
    MESSAGE_SENT: 'message_sent',                    // 消息发送后
    MESSAGE_RECEIVED: 'message_received',            // AI消息接收后
    USER_MESSAGE_RENDERED: 'user_message_rendered', // 用户消息渲染完成
    CHARACTER_MESSAGE_RENDERED: 'character_message_rendered', // AI消息渲染完成
    MESSAGE_UPDATED: 'message_updated',              // 消息更新
    MESSAGE_DELETED: 'message_deleted',              // 消息删除
    MESSAGE_SWIPED: 'message_swiped',               // 消息滑动切换

    // 生成相关事件
    GENERATION_STARTED: 'generation_started',        // 生成开始
    GENERATION_STOPPED: 'generation_stopped',        // 生成停止
    GENERATION_ENDED: 'generation_ended',            // 生成结束

    // 聊天相关事件
    CHAT_CHANGED: 'chat_changed',                    // 聊天切换
    CHAT_CREATED: 'chat_created',                    // 新聊天创建

    // 应用相关事件
    APP_READY: 'app_ready',                          // 应用就绪
    SETTINGS_LOADED: 'settings_loaded_after'         // 设置加载完成
};

/**
 * 事件兼容性映射
 * 用于处理不同版本 SillyTavern 的事件名称差异
 */
export const EventAliases = {
    'chat_changed': ['chat_changed', 'chatchanged', 'CHAT_CHANGED'],
    'message_sent': ['message_sent', 'MESSAGE_SENT'],
    'user_message_rendered': ['user_message_rendered', 'USER_MESSAGE_RENDERED'],
    'message_rendered': ['message_rendered', 'MESSAGE_RENDERED'],
    'generation_started': ['generation_started', 'GENERATION_STARTED'],
    'generation_ended': ['generation_ended', 'GENERATION_ENDED'],
    'message_deleted': ['message_deleted', 'MESSAGE_DELETED', 'message_removed'],
    'message_updated': ['message_updated', 'MESSAGE_UPDATED', 'message_edited', 'MESSAGE_EDITED'],
    'message_swiped': ['message_swiped', 'MESSAGE_SWIPED']
};

const MESSAGE_INDEX_FIELDS = ['messageIndex', 'message_index', 'index', 'mesId', 'mes_id'];

function parseSafeIndex(value) {
    if (Number.isSafeInteger(value) && value >= 0) return value;
    if (typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value.trim())) {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) ? parsed : null;
    }
    return null;
}

/**
 * 从 SillyTavern 事件参数中解析可信消息索引。
 * @param {unknown[]} args
 * @param {unknown[]} chat
 * @returns {number|null}
 */
export function resolveMessageEventIndex(args, chat = []) {
    const safeChat = Array.isArray(chat) ? chat : [];
    for (const value of Array.isArray(args) ? args : []) {
        const direct = parseSafeIndex(value);
        if (direct !== null && direct < safeChat.length) return direct;
        if (!value || typeof value !== 'object') continue;

        for (const field of MESSAGE_INDEX_FIELDS) {
            const nested = parseSafeIndex(value[field]);
            if (nested !== null && nested < safeChat.length) return nested;
        }

        const identityIndex = safeChat.indexOf(value);
        if (identityIndex >= 0) return identityIndex;
        if (value.message && typeof value.message === 'object') {
            const messageIndex = safeChat.indexOf(value.message);
            if (messageIndex >= 0) return messageIndex;
        }
    }
    return null;
}

/**
 * 事件监听器管理类
 * 提供统一的事件注册和清理机制
 */
export class EventListenerManager {
    constructor() {
        /** @type {Array<{eventSource: any, eventType: string, handler: Function, registered: boolean}>} */
        this.listeners = [];
        /** @type {Map<string, Function>} 去重计时器 */
        this.debounceTimers = new Map();
    }

    /**
     * 注册事件监听器
     * @param {any} eventSource - SillyTavern 事件源对象
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 事件处理函数
     * @param {Object} options - 配置选项
     * @param {number} [options.debounce=0] - 防抖时间（毫秒）
     * @param {boolean} [options.useAlias=false] - 是否使用别名兼容
     * @returns {Function} 取消监听的函数
     */
    register(eventSource, eventType, handler, options = {}) {
        const { debounce = 0, useAlias = false } = options;

        // 创建包装处理函数
        let wrappedHandler = handler;

        // 添加防抖
        if (debounce > 0) {
            wrappedHandler = this._createDebouncedHandler(eventType, handler, debounce);
        }

        // 注册事件
        const listenerEntry = {
            eventSource,
            eventType,
            handler: wrappedHandler,
            originalHandler: handler,
            options: options.eventOptions,
            registered: false,
            mode: 'unknown',
            registeredEventTypes: [],
        };

        // DOM EventTarget 路径
        if (typeof eventSource?.addEventListener === 'function') {
            try {
                eventSource.addEventListener(eventType, wrappedHandler, options.eventOptions);
                listenerEntry.registered = true;
                listenerEntry.mode = 'dom';
                listenerEntry.registeredEventTypes.push(eventType);
            } catch (e) {
                console.warn(`[玉子市场] 注册 DOM 事件失败: ${eventType}`, e);
            }
        }
        // 使用别名兼容的 EventSource 路径
        else if (useAlias && EventAliases[eventType]) {
            const aliases = EventAliases[eventType];
            listenerEntry.mode = 'eventSource';
            for (const alias of aliases) {
                try {
                    eventSource.on(alias, wrappedHandler);
                    listenerEntry.registered = true;
                    listenerEntry.registeredEventTypes.push(alias);
                } catch (e) {
                    // 忽略不支持的事件类型
                }
            }
        } else {
            try {
                eventSource.on(eventType, wrappedHandler);
                listenerEntry.registered = true;
                listenerEntry.mode = 'eventSource';
                listenerEntry.registeredEventTypes.push(eventType);
            } catch (e) {
                console.warn(`[玉子市场] 注册事件失败: ${eventType}`, e);
            }
        }

        if (listenerEntry.registered) {
            this.listeners.push(listenerEntry);
        }

        // 返回取消函数
        return () => this.unregister(eventSource, eventType, handler);
    }

    /**
     * 创建防抖处理函数
     * @private
     */
    _createDebouncedHandler(eventType, handler, debounce) {
        return (...args) => {
            const timerKey = eventType;

            // 清除之前的计时器
            if (this.debounceTimers.has(timerKey)) {
                clearTimeout(this.debounceTimers.get(timerKey));
            }

            // 设置新的计时器
            const timer = setTimeout(() => {
                handler(...args);
                this.debounceTimers.delete(timerKey);
            }, debounce);

            this.debounceTimers.set(timerKey, timer);
        };
    }

    /**
     * 取消事件监听
     * @param {any} eventSource - 事件源对象
     * @param {string} eventType - 事件类型
     * @param {Function} handler - 原始处理函数
     */
    unregister(eventSource, eventType, handler) {
        const index = this.listeners.findIndex(
            l => l.eventSource === eventSource &&
                 l.eventType === eventType &&
                 l.originalHandler === handler
        );

        if (index !== -1) {
            const listener = this.listeners[index];
            this._removeListener(listener);
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 移除单个监听器
     * @private
     */
    _removeListener(listener) {
        const { eventSource, eventType, handler, registered, options, mode, registeredEventTypes } = listener;

        if (!registered) return;

        if (mode === 'dom' && typeof eventSource?.removeEventListener === 'function') {
            try {
                eventSource.removeEventListener(eventType, handler, options);
            } catch (e) {
                // 忽略错误
            }
            return;
        }

        const eventTypes = registeredEventTypes?.length ? registeredEventTypes : [eventType];
        for (const registeredType of eventTypes) {
            try {
                if (typeof eventSource.off === 'function') {
                    eventSource.off(registeredType, handler);
                } else if (typeof eventSource.removeListener === 'function') {
                    eventSource.removeListener(registeredType, handler);
                }
            } catch (e) {
                // 忽略错误
            }
        }
    }

    /**
     * 清除所有事件监听器
     */
    clearAll() {
        for (const listener of this.listeners) {
            this._removeListener(listener);
        }
        this.listeners = [];

        // 清除所有防抖计时器
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
    }

    /**
     * 获取已注册的监听器数量
     * @returns {number}
     */
    get count() {
        return this.listeners.length;
    }
}

/**
 * 创建事件监听器管理器实例
 */
export function createEventListenerManager() {
    return new EventListenerManager();
}

/**
 * 安全获取 SillyTavern 上下文
 * @returns {Object|null}
 */
export function getSTContext() {
    try {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            return SillyTavern.getContext();
        }
        return null;
    } catch (e) {
        console.warn('[玉子市场] 获取上下文失败:', e);
        return null;
    }
}

/**
 * 安全获取事件源
 * @returns {Object|null}
 */
export function getEventSource() {
    const context = getSTContext();
    return context?.eventSource || null;
}

/**
 * 检查事件类型是否支持
 * @param {any} eventSource - 事件源
 * @param {string} eventType - 事件类型
 * @returns {boolean}
 */
export function isEventSupported(eventSource, eventType) {
    if (!eventSource || typeof eventSource.on !== 'function') {
        return false;
    }

    // 简单检查：尝试注册一个空函数看是否报错
    try {
        const testHandler = () => {};
        eventSource.on(eventType, testHandler);
        eventSource.off(eventType, testHandler);
        return true;
    } catch (e) {
        return false;
    }
}
