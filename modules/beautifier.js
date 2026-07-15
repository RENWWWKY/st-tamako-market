// modules/beautifier.js
/**
 * 玉子市场 - 美化器系统
 * @version 2.8.5
 */

import {
    cachedTemplate, cachedTemplateSource, cachedTemplateId, beautifierLoadTimeout,
    setCachedTemplate, setBeautifierLoadTimeout, clearTemplateCache as clearCache,
    getCachedTemplateId
} from './state.js';
import { getDeraMessage, getActiveTemplate } from './utils.js';
import { buildChatDataSignature } from './beautifier-cache.js';
import { projectUserMessage, resolveUserMessageSource } from './message-source-core.js';

export { clearCache as clearTemplateCache };

let cachedChatData = null;
let cachedChatDataSignature = '';

// ===== 模板解析 =====

export function parseBeautifierTemplate(input, templateId = null) {
    if (!input?.trim()) return null;

    // 如果有模板ID且与缓存匹配，直接返回缓存
    if (templateId && templateId === getCachedTemplateId() && cachedTemplate) {
        return cachedTemplate;
    }

    // 如果没有模板ID，使用内容匹配
    if (!templateId && input === cachedTemplateSource && cachedTemplate) {
        return cachedTemplate;
    }

    const trimmed = input.trim();
    let result = null;
    let regexInfo = null;

    // 尝试解析 JSON
    try {
        const json = JSON.parse(trimmed);
        if (json.replaceString) {
            let htmlContent = json.replaceString;
            htmlContent = htmlContent
                .replace(/^```html\s*\n?/i, '')
                .replace(/^```\s*\n?/, '')
                .replace(/\n?```\s*$/, '')
                .trim();

            if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html') || htmlContent.includes('<body')) {
                result = htmlContent;
                if (json.findRegex) {
                    regexInfo = { findRegex: json.findRegex, scriptName: json.scriptName || '' };
                }
            }
        }
    } catch (e) { }

    // 直接解析 HTML
    if (!result) {
        let htmlContent = trimmed;
        if (htmlContent.startsWith('```html') || htmlContent.startsWith('```\n<!DOCTYPE')) {
            htmlContent = htmlContent
                .replace(/^```html\s*\n?/i, '')
                .replace(/^```\s*\n?/, '')
                .replace(/\n?```\s*$/, '')
                .trim();
        }
        if (htmlContent.includes('<!DOCTYPE') || /^<html/i.test(htmlContent)) {
            result = htmlContent;
        }
    }

    // 检查 body 标签
    if (!result && trimmed.includes('<body') && trimmed.includes('</body>')) {
        result = trimmed;
    }

    if (result) {
        const parsed = { html: result, regexInfo };
        setCachedTemplate(parsed, input, templateId);
        return parsed;
    }

    return null;
}

export function validateTemplate(templateData) {
    if (!templateData || !templateData.html) return { valid: false, error: '模板为空' };
    const html = templateData.html;
    if (!html.includes('<body') && !html.includes('<div') && !html.includes('<html')) {
        return { valid: false, error: '模板缺少有效的 HTML 结构' };
    }
    return { valid: true };
}

// ===== 获取当前活动模板的解析结果 =====

export function getActiveTemplateData() {
    const activeTemplate = getActiveTemplate();
    if (!activeTemplate) return null;
    return parseBeautifierTemplate(activeTemplate.template, activeTemplate.id);
}

// ===== 聊天数据提取 =====

export function extractAllChatData() {
    const data = { chat: [], tags: {} };

    try {
        const context = SillyTavern.getContext();
        if (!context?.chat) return data;

        const signature = buildChatDataSignature(context.chat);
        if (cachedChatData && cachedChatDataSignature === signature) {
            return cachedChatData;
        }

        data.chat = context.chat.map(projectUserMessage).filter(Boolean);

        const tagNames = ['stage', 'recall', 'prologue', 'plot', 'cast', 'scene_direction', 'content', 'file'];
        for (const tag of tagNames) {
            data.tags[tag] = extractTagFromChatHistory(context.chat, tag);
        }
        data.tags.contentFile = extractFileFromContentTag(context.chat);

        cachedChatData = data;
        cachedChatDataSignature = signature;
    } catch (e) {
        console.error('[玉子市场] 提取聊天数据失败:', e);
    }

    return data;
}

export function extractTagFromChatHistory(chat, tagName) {
    if (!chat) return '';
    const regex = new RegExp(`(?<!\`)<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}\\s*>(?!\`)`, 'i');

    for (let i = chat.length - 1; i >= 0; i--) {
        const source = resolveUserMessageSource(chat[i]);
        if (!source) continue;
        const match = source.text.match(regex);
        if (match && match[1]) return match[1].trim();
    }
    return '';
}

export function extractFileFromContentTag(chat) {
    if (!chat) return '';
    for (let i = chat.length - 1; i >= 0; i--) {
        const source = resolveUserMessageSource(chat[i]);
        if (!source) continue;
        const contentPattern = /(?<!`)<content(?:\s[^>]*)?>([\s\S]*?)<\/content\s*>(?!`)/gi;
        let contentMatch;
        while ((contentMatch = contentPattern.exec(source.text)) !== null) {
            const contentInner = contentMatch[1];
            const fileMatch = contentInner.match(/(?<!`)<file(?:\s[^>]*)?>([\s\S]*?)<\/file\s*>(?!`)/i);
            if (fileMatch && fileMatch[1]) return fileMatch[1].trim();
        }
    }
    return '';
}

/**
 * 编码 HTML script raw-text 上下文中的闭合标签起始序列，防止提前结束元素。
 * 该处理只用于兼容 <script type="text/plain"> 内的 $1；精确原文仍由
 * window.TAMAKO_INJECTED_RAW 提供。
 * @param {string} text
 * @returns {string}
 */
export function escapeScriptRawText(text) {
    return String(text ?? '').replace(/<\/script/gi, '<\\/script');
}

/**
 * 对普通 HTML 占位符做保守结构编码。
 * 除基本 HTML 元字符外，同时编码引号、反引号、等号和 ASCII 空白，
 * 避免 `$1` 从文本或属性值中闭合当前结构。模板仍必须避免把 `$1`
 * 放进 href、事件属性等具有执行语义的槽位。
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"'`=\t\n\f\r ]/g, character => {
        switch (character) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            case '`': return '&#96;';
            case '=': return '&#61;';
            case '\t': return '&#9;';
            case '\n': return '&#10;';
            case '\f': return '&#12;';
            case '\r': return '&#13;';
            case ' ': return '&#32;';
            default: return character;
        }
    });
}

/**
 * 按 HTML 上下文单次替换美化器占位符。
 * text/plain script 数据块保留文本兼容，但编码闭合 script；其他位置使用 HTML 转义。
 * 单次 replace 不会再次扫描替换结果，因此原文中的 `$1` 不会递归展开。
 * @param {string} html
 * @param {string} rawMessage
 * @returns {string}
 */
export function replaceBeautifierPlaceholders(html, rawMessage) {
    const template = String(html ?? '');
    if (!template.includes('$1')) return template;

    const rawTextMessage = escapeScriptRawText(rawMessage);
    const escapedRawMessage = escapeHtml(rawMessage || '');
    return template.replace(
        /(<script\b[^>]*type\s*=\s*["']text\/plain["'][^>]*>)([\s\S]*?)(<\/script>)|\$1/gi,
        (match, openTag, inner, closeTag) => {
            if (!openTag) return escapedRawMessage;
            return openTag + inner.replace(/\$1/g, rawTextMessage) + closeTag;
        }
    );
}

// ===== 模板注入 =====
// 安全说明：保留 allow-same-origin 以支持模板访问 SillyTavern 上下文
// 用户应仅使用可信来源的模板

function injectDataIntoTemplate(html, rawMessage, fullChatData) {
    const injectionScript = `
<script>
(function() {
    try {
        if (window.name && window.name.startsWith('TAMAKO_DATA:')) {
            var dataStr = window.name.substring(12);
            var parsed = JSON.parse(dataStr);
            window.TAMAKO_INJECTED_CHAT = parsed.chat || [];
            window.TAMAKO_INJECTED_TAGS = parsed.tags || {};
            window.TAMAKO_INJECTED_RAW = parsed.raw || '';
        }
    } catch(e) {
        console.log('[玉子市场] 数据解析失败，使用空注入数据');
    }

    window.getSTChat = function() {
        return Array.isArray(window.TAMAKO_INJECTED_CHAT) ? window.TAMAKO_INJECTED_CHAT : [];
    };

    window.getContext = window.getContext || function() {
        return { chat: window.getSTChat() };
    };

    // ===== TavernHelper 代理注入 (适配回响等模板的世界书访问) =====
    // 检测是否存在 JS-Slash-Runner 扩展 (TavernHelper)
    try {
        var TH = window.parent && window.parent.TavernHelper;
        if (TH) {
            // 注入回响模板需要的世界书 API 代理函数
            window.getChatLorebook = window.getChatLorebook || function() {
                return TH.getChatLorebook.apply(TH, arguments);
            };
            window.getVariables = window.getVariables || function() {
                return TH.getVariables.apply(TH, arguments);
            };
            window.getCharLorebooks = window.getCharLorebooks || function() {
                return TH.getCharLorebooks.apply(TH, arguments);
            };
            window.getCurrentCharPrimaryLorebook = window.getCurrentCharPrimaryLorebook || function() {
                return TH.getCurrentCharPrimaryLorebook.apply(TH, arguments);
            };
            window.getLorebookSettings = window.getLorebookSettings || function() {
                return TH.getLorebookSettings.apply(TH, arguments);
            };
            window.getLorebookEntries = window.getLorebookEntries || function() {
                return TH.getLorebookEntries.apply(TH, arguments);
            };
            console.log('[玉子市场] TavernHelper API 已注入');
        }
    } catch(e) {
        console.log('[玉子市场] TavernHelper 不可用，跳过世界书 API 注入');
    }

    console.log('[玉子市场] iframe 初始化完成');
})();
<\/script>
`;

    let modifiedHtml = html;

    if (modifiedHtml.includes('</head>')) {
        modifiedHtml = modifiedHtml.replace('</head>', injectionScript + '</head>');
    } else if (modifiedHtml.includes('<body')) {
        modifiedHtml = modifiedHtml.replace(/<body/i, injectionScript + '<body');
    } else {
        modifiedHtml = injectionScript + modifiedHtml;
    }

    return modifiedHtml;
}

// ===== 渲染 =====

export function renderWithBeautifier($container, rawMessage, templateData) {
    try {
        let html = replaceBeautifierPlaceholders(templateData.html, rawMessage);

        const fullChatData = extractAllChatData();
        html = injectDataIntoTemplate(html, rawMessage, fullChatData);

        $container.css('position', 'relative');

        let iframe = $container.find('.tamako-beautifier-frame')[0];
        let $loading = $container.find('.tamako-beautifier-loading');

        if (beautifierLoadTimeout) {
            clearTimeout(beautifierLoadTimeout);
            setBeautifierLoadTimeout(null);
        }

        if (!iframe || !$loading.length) {
            $container.empty();
            $container.append(`
                <div class="tamako-beautifier-loading">
                    <span class="icon">🐔</span>
                    <span class="message">${getDeraMessage('loading')}</span>
                </div>
            `);
            $container.append(`<iframe class="tamako-beautifier-frame" frameborder="0" sandbox="allow-scripts allow-same-origin"></iframe>`);
            iframe = $container.find('.tamako-beautifier-frame')[0];
            $loading = $container.find('.tamako-beautifier-loading');
        }

        if (!iframe) return false;

        const $iframe = $(iframe);
        $iframe.css('opacity', '0');
        $loading.show();

        if (iframe._blobUrl) {
            URL.revokeObjectURL(iframe._blobUrl);
            iframe._blobUrl = null;
        }

        iframe.onload = null;
        iframe.onload = function () {
            if (beautifierLoadTimeout) {
                clearTimeout(beautifierLoadTimeout);
                setBeautifierLoadTimeout(null);
            }
            setTimeout(() => {
                $loading.hide();
                $iframe.css('opacity', '1');
            }, 50);
        };

        setBeautifierLoadTimeout(setTimeout(() => {
            if ($loading.is(':visible')) {
                console.warn('[玉子市场] iframe 加载超时，强制显示');
                $loading.hide();
                $iframe.css('opacity', '1');
            }
        }, 3000));

        const dataPayload = JSON.stringify({
            chat: fullChatData.chat,
            tags: fullChatData.tags,
            raw: rawMessage
        });

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        iframe._blobUrl = blobUrl;

        iframe.name = 'TAMAKO_DATA:' + dataPayload;
        iframe.src = blobUrl;

        return true;
    } catch (e) {
        console.error('[玉子市场] 美化器渲染失败:', e);
        return false;
    }
}

