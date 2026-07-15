// modules/capture-core.js
/**
 * 玉子市场 - 捕获核心纯逻辑
 *
 * 目标：抽离不依赖 DOM 和 SillyTavern UI 的纯逻辑，
 * 为自动化测试提供稳定边界。
 */

import { resolveUserMessageSource } from './message-source-core.js';

/** @type {Map<string, RegExp>} 标签正则缓存 */
const tagRegexCache = new Map();

/** @type {RegExp} AM编号正则 */
const AM_CODE_REGEX = /AM\d{4}/gi;

/** @type {RegExp[]} 关键词正则列表 */
const KEYWORD_PATTERNS = [
    /以上是用户的本轮输入/,
    /以上是用户本轮输入/,
    /以上是用户的/,
    /以下是用户的本轮输入/,
    /以下是用户本轮输入/,
    /以下是用户的/
];

const TAG_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.:-]{0,63}$/;
const MAX_CAPTURE_TAGS = 32;

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeCaptureTags(tags, fallback = []) {
    const source = Array.isArray(tags) ? tags : fallback;
    const seen = new Set();
    const normalized = [];

    for (const value of source) {
        const tag = typeof value === 'string' ? value.trim() : '';
        const key = tag.toLowerCase();
        if (!tag || !TAG_NAME_PATTERN.test(tag) || seen.has(key)) continue;
        seen.add(key);
        normalized.push(tag);
        if (normalized.length >= MAX_CAPTURE_TAGS) break;
    }

    return normalized;
}

/**
 * 获取或创建标签正则表达式（带缓存）
 * @param {string} tagName
 * @returns {RegExp}
 */
export function getTagRegex(tagName) {
    const normalizedTag = normalizeCaptureTags([tagName])[0];
    if (!normalizedTag) {
        throw new TypeError(`非法捕获标签名: ${String(tagName)}`);
    }
    const cacheKey = normalizedTag.toLowerCase();

    if (!tagRegexCache.has(cacheKey)) {
        const escapedTag = escapeRegExp(normalizedTag);
        const regex = new RegExp(
            `(?<!\`)<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}\\s*>(?!\`)`,
            'gi'
        );
        tagRegexCache.set(cacheKey, regex);
    }

    const regex = tagRegexCache.get(cacheKey);
    regex.lastIndex = 0;
    return regex;
}

/**
 * 清理标签正则缓存
 */
export function clearTagRegexCache() {
    tagRegexCache.clear();
}

/**
 * 从消息中提取指定标签的内容
 * @param {string} message
 * @param {string} tagName
 * @returns {string[]}
 */
export function extractTagContent(message, tagName) {
    const matches = [];
    if (!message || !tagName) return matches;

    try {
        const regex = getTagRegex(tagName);
        let match;

        while ((match = regex.exec(message)) !== null) {
            matches.push(match[0]);
        }
    } catch (e) {
        console.warn(`[玉子市场] 提取标签 ${tagName} 失败:`, e);
    }

    return matches;
}

/**
 * 从用户消息或已解析来源中提取剧情内容。
 * 字符串输入仅作为旧调用兼容，按 mes 处理。
 * @param {string | Object} input
 * @param {{ autoCapture?: boolean, captureTags?: string[] } | null} settings
 * @param {boolean} extensionEnabled
 * @returns {{ content: string, rawMessage: string, sourceKind: 'qrf_plot' | 'mes' } | null}
 */
export function extractPlotContent(input, settings, extensionEnabled) {
    if (!extensionEnabled || !settings?.autoCapture) {
        return null;
    }

    const source = typeof input === 'string'
        ? { kind: 'mes', text: input, authoritative: false }
        : (input?.kind && typeof input.text === 'string' ? input : resolveUserMessageSource(input));
    if (!source) return null;

    const message = source.text;
    const tags = normalizeCaptureTags(settings.captureTags);
    if (tags.length === 0) return null;

    const hasKeyword = source.kind === 'qrf_plot' || KEYWORD_PATTERNS.some(pattern => {
        pattern.lastIndex = 0;
        return pattern.test(message);
    });
    if (!hasKeyword) return null;

    KEYWORD_PATTERNS.forEach(pattern => {
        pattern.lastIndex = 0;
    });

    const parts = [];
    for (const tag of tags) {
        parts.push(...extractTagContent(message, tag));
    }

    if (parts.length === 0) return null;

    return {
        content: parts.join('\n\n'),
        rawMessage: message,
        sourceKind: source.kind,
    };
}

/**
 * 提取 AM 编号
 * @param {string} content
 * @returns {string[]}
 */
export function extractAMCodes(content) {
    if (!content) return [];

    AM_CODE_REGEX.lastIndex = 0;
    const matches = content.match(AM_CODE_REGEX);
    return matches ? [...new Set(matches.map(match => match.toUpperCase()))] : [];
}

/**
 * 过滤捕获记录
 * @param {{ content: string }[] | null | undefined} plots
 * @param {string} query
 * @returns {{ content: string }[]}
 */
export function filterPlots(plots, query) {
    if (!query || !plots) return plots || [];

    const lowerQuery = query.toLowerCase();

    return plots.filter(plot => {
        const content = plot.content.toLowerCase();
        const amCodes = extractAMCodes(plot.content).join(' ').toLowerCase();
        return content.includes(lowerQuery) || amCodes.includes(lowerQuery);
    });
}
