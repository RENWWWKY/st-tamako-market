// modules/beautifier-cache.js
/**
 * 玉子市场 - 美化器缓存签名工具
 *
 * 目标：提供比长度+首中尾字符更稳定的轻量签名，
 * 同时保持足够低的计算成本，避免缓存判断本身成为新热点。
 */

import { projectUserMessage } from './message-source-core.js';

const EMPTY_VALUE_SIGNATURE = '0:0';
const EMPTY_CHAT_SIGNATURE = 'empty';

/**
 * 计算字符串的轻量 32 位哈希签名。
 * 使用线性扫描滚动哈希，稳定且成本可控。
 *
 * @param {unknown} value
 * @returns {string}
 */
export function buildValueSignature(value) {
    if (value === null || value === undefined) {
        return EMPTY_VALUE_SIGNATURE;
    }

    const text = String(value);
    if (!text) {
        return EMPTY_VALUE_SIGNATURE;
    }

    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619) >>> 0;
    }

    return `${text.length}:${hash.toString(16)}`;
}

/**
 * 构建聊天数组签名。
 *
 * @param {Array<any>} chat
 * @returns {string}
 */
export function buildChatDataSignature(chat) {
    if (!Array.isArray(chat) || chat.length === 0) {
        return EMPTY_CHAT_SIGNATURE;
    }

    const parts = [];

    for (const msg of chat) {
        const projected = projectUserMessage(msg);
        if (!projected) continue;

        parts.push([
            projected.sourceKind,
            buildValueSignature(projected.content),
        ].join('~'));
    }

    return parts.length ? parts.join('|') : EMPTY_CHAT_SIGNATURE;
}
