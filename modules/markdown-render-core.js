// modules/markdown-render-core.js

const TAG_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.:-]{0,63}$/;
const SECTION_PATTERN = /<([A-Za-z_][A-Za-z0-9_.:-]{0,63})(?:\s[^>]*)?>([\s\S]*?)<\/\1\s*>/gy;

/**
 * 将捕获内容拆为有序标签 section。无法完整、安全拆分时返回失败。
 * @param {unknown} content
 * @returns {{ ok: true, sections: Array<{tagName: string, innerContent: string}> } | { ok: false, sections: [], raw: string, reason: string }}
 */
export function parseCapturedSections(content) {
    const raw = typeof content === 'string' ? content : '';
    if (!raw.trim()) {
        return { ok: false, sections: [], raw, reason: 'empty' };
    }

    const sections = [];
    let cursor = 0;
    while (cursor < raw.length) {
        const whitespace = raw.slice(cursor).match(/^\s*/)?.[0] || '';
        cursor += whitespace.length;
        if (cursor >= raw.length) break;

        SECTION_PATTERN.lastIndex = cursor;
        const match = SECTION_PATTERN.exec(raw);
        if (!match || match.index !== cursor || !TAG_NAME_PATTERN.test(match[1])) {
            return { ok: false, sections: [], raw, reason: 'malformed-section' };
        }

        const nestedSameTag = new RegExp(`<${match[1]}(?:\\s|>)`, 'i');
        if (nestedSameTag.test(match[2])) {
            return { ok: false, sections: [], raw, reason: 'ambiguous-nesting' };
        }

        sections.push({ tagName: match[1], innerContent: match[2] });
        cursor = SECTION_PATTERN.lastIndex;
    }

    return sections.length
        ? { ok: true, sections }
        : { ok: false, sections: [], raw, reason: 'no-sections' };
}

/**
 * 移除所有非空行共有的最小前导空白，保留相对缩进。
 * @param {unknown} text
 * @returns {string}
 */
export function dedentMarkdown(text) {
    const normalized = typeof text === 'string'
        ? text.replace(/\r\n?/g, '\n')
        : '';
    const lines = normalized.split('\n');
    const nonEmpty = lines.filter(line => line.trim().length > 0);
    if (!nonEmpty.length) return normalized;

    const commonIndent = Math.min(...nonEmpty.map(line => line.match(/^[ \t]*/)?.[0].length || 0));
    if (commonIndent === 0) return normalized;

    return lines.map(line => line.trim().length ? line.slice(commonIndent) : line).join('\n');
}
