// modules/capture.js
/**
 * 玉子市场 - 消息捕获系统
 * @version 2.8.6
 *
 * 更新日志:
 * - v2.8.6: 添加 JSDoc 类型注释
 * - v2.8.6: 预编译正则表达式，提升性能
 * - v2.8.6: 优化消息扫描逻辑
 */

import {
    extensionEnabled, validateDebounceTimer,
    setCapturedPlots, setValidateDebounceTimer, getCapturedPlots
} from './state.js';
import { getSettings } from './settings.js';
export { clearTagRegexCache, extractTagContent, filterPlots } from './capture-core.js';
import { extractPlotContent as extractPlotContentCore } from './capture-core.js';

// ===== 类型定义 =====

/**
 * @typedef {Object} ExtractedContent
 * @property {string} content - 提取的内容
 * @property {string} rawMessage - 原始消息
 * @property {'qrf_plot'|'mes'} sourceKind - 权威来源类型
 */

/**
 * @typedef {Object} CapturedPlot
 * @property {string} content - 捕获的内容
 * @property {string} rawMessage - 原始消息
 * @property {'qrf_plot'|'mes'} sourceKind - 权威来源类型
 * @property {number} timestamp - 时间戳
 * @property {number} messageIndex - 消息索引
 */

/**
 * @typedef {Object} ScanResult
 * @property {boolean} limited - 是否达到扫描限制
 * @property {number} count - 找到的数量
 */

/**
 * @typedef {Object} Callbacks
 * @property {Function} [onUpdate] - 更新回调
 * @property {Function} [onHistoryUpdate] - 历史更新回调
 * @property {Function} [onNewItem] - 新项目回调
 */

// ===== 标签提取与过滤纯逻辑 =====

/**
 * 从用户消息或已解析来源中提取剧情内容
 * @param {string|Object} message - 消息或来源
 * @returns {ExtractedContent|null} 提取的内容或 null
 */
export function extractPlotContent(message, settings = null) {
    const effectiveSettings = settings || getSettings();
    return extractPlotContentCore(message, effectiveSettings, extensionEnabled);
}


function arePlotsEqual(left, right) {
    return left.length === right.length && left.every((plot, index) => {
        const other = right[index];
        return plot.messageIndex === other.messageIndex
            && plot.content === other.content
            && plot.rawMessage === other.rawMessage
            && plot.sourceKind === other.sourceKind
            && plot.timestamp === other.timestamp;
    });
}

function normalizePlots(plots, maxStoredPlots) {
    const sorted = [...plots].sort((a, b) => a.messageIndex - b.messageIndex);
    return sorted.length > maxStoredPlots ? sorted.slice(-maxStoredPlots) : sorted;
}

function notifyInventory(callbacks, plots) {
    const latest = plots[plots.length - 1];
    callbacks.onUpdate?.(latest?.content || '', latest?.rawMessage || '');
    callbacks.onHistoryUpdate?.();
}

// ===== 消息处理 =====

/**
 * 对账单条用户消息。
 * @param {number} messageIndex - 消息索引
 * @param {Callbacks} [callbacks={}] - 回调函数
 * @param {Object|null} [settings=null] - 当前设置快照
 * @returns {boolean} 是否成功捕获
 */
export function reconcileUserMessage(messageIndex, callbacks = {}, settings = null) {
    const effectiveSettings = settings || getSettings();
    if (!extensionEnabled || !effectiveSettings.autoCapture || !Number.isSafeInteger(messageIndex)) return false;

    try {
        const context = SillyTavern.getContext();
        if (!context?.chat || messageIndex < 0 || messageIndex >= context.chat.length) {
            return false;
        }

        const message = context.chat[messageIndex];
        const currentPlots = getCapturedPlots();
        const existingIndex = currentPlots.findIndex(plot => plot.messageIndex === messageIndex);
        const existing = existingIndex >= 0 ? currentPlots[existingIndex] : null;
        const extracted = extractPlotContent(message, effectiveSettings);
        let nextPlots = [...currentPlots];
        let added = false;

        if (!extracted && !existing) return false;
        if (!extracted && existing) {
            nextPlots.splice(existingIndex, 1);
        } else if (extracted && existing) {
            const updated = {
                ...existing,
                content: extracted.content,
                rawMessage: extracted.rawMessage,
                sourceKind: extracted.sourceKind,
            };
            if (updated.content === existing.content
                && updated.rawMessage === existing.rawMessage
                && updated.sourceKind === existing.sourceKind) return false;
            nextPlots[existingIndex] = updated;
        } else if (extracted) {
            added = true;
            nextPlots.push({ ...extracted, timestamp: Date.now(), messageIndex });
        }

        nextPlots = normalizePlots(nextPlots, effectiveSettings.maxStoredPlots || 50);
        setCapturedPlots(nextPlots);
        notifyInventory(callbacks, nextPlots);
        if (added) callbacks.onNewItem?.();
        return true;
    } catch (e) {
        console.error('[玉子市场] 对账消息错误:', e);
        return false;
    }
}

export function handleUserMessage(messageIndex, callbacks = {}, settings = null) {
    return reconcileUserMessage(messageIndex, callbacks, settings);
}

/**
 * 检查最新的用户消息
 * @param {Callbacks} [callbacks={}] - 回调函数
 */
export function checkLatestUserMessage(callbacks = {}) {
    const settings = getSettings();
    if (!extensionEnabled || !settings.autoCapture) return;

    try {
        const context = SillyTavern.getContext();
        if (!context?.chat) return;

        // 从后向前查找最新的用户消息
        for (let i = context.chat.length - 1; i >= 0; i--) {
            if (context.chat[i]?.is_user) {
                reconcileUserMessage(i, callbacks, settings);
                break; // 只处理最新的一条
            }
        }
    } catch (e) {
        console.error('[玉子市场] 检查最新消息错误:', e);
    }
}

/**
 * 扫描所有消息
 * @param {Callbacks} [callbacks={}] - 回调函数
 * @returns {ScanResult} 扫描结果
 */
export function scanAllMessages(callbacks = {}) {
    /** @type {ScanResult} */
    const result = { limited: false, count: 0 };

    if (!extensionEnabled) return result;

    try {
        const context = SillyTavern.getContext();
        const chat = Array.isArray(context?.chat) ? context.chat : [];
        const settings = getSettings();
        const maxScan = settings.maxScanMessages || 50;
        const maxStore = settings.maxStoredPlots || 50;
        const currentPlots = getCapturedPlots();
        const currentByIndex = new Map(currentPlots.map(plot => [plot.messageIndex, plot]));
        const rebuiltPlots = [];
        let scannedCount = 0;

        for (let i = chat.length - 1; i >= 0 && scannedCount < maxScan; i--) {
            if (chat[i]?.is_user !== true) continue;
            scannedCount++;

            const extracted = extractPlotContent(chat[i], settings);
            if (!extracted) continue;

            const existing = currentByIndex.get(i);
            const unchanged = existing
                && existing.content === extracted.content
                && existing.rawMessage === extracted.rawMessage
                && existing.sourceKind === extracted.sourceKind;

            rebuiltPlots.push({
                ...extracted,
                timestamp: unchanged ? existing.timestamp : Date.now(),
                messageIndex: i,
            });
        }

        if (scannedCount >= maxScan) {
            let remainingUsers = scannedCount;
            for (let i = chat.length - 1; i >= 0; i--) {
                if (chat[i]?.is_user !== true) continue;
                remainingUsers--;
                if (remainingUsers < 0) {
                    result.limited = true;
                    break;
                }
            }
        }

        const finalPlots = normalizePlots(rebuiltPlots, maxStore);
        if (!arePlotsEqual(currentPlots, finalPlots)) {
            setCapturedPlots(finalPlots);
        }

        notifyInventory(callbacks, finalPlots);
        result.count = finalPlots.length;
    } catch (e) {
        console.error('[玉子市场] 扫描错误:', e);
    }

    return result;
}

// ===== 验证捕获记录 =====

/**
 * 验证捕获的记录（带防抖）
 * @param {Callbacks} [callbacks={}] - 回调函数
 */
export function validateCapturedPlots(callbacks = {}) {
    if (!extensionEnabled) return;

    if (validateDebounceTimer) clearTimeout(validateDebounceTimer);

    setValidateDebounceTimer(setTimeout(() => {
        doValidateCapturedPlots(callbacks);
    }, 300));
}

/**
 * 执行验证捕获记录
 * @param {Callbacks} [callbacks={}] - 回调函数
 * @private
 */
function doValidateCapturedPlots(callbacks = {}) {
    scanAllMessages(callbacks);
}

