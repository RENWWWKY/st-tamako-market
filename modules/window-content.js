// modules/window-content.js
/**
 * 玉子市场 - 当前内容渲染
 * @version 2.8.6
 *
 * 负责：空态、美化器渲染、纯文本回退与内容区资源释放
 */

import * as hostLib from '../../../../../lib.js';
import { ICONS } from './constants.js';
import { getSettings } from './settings.js';
import { getDeraMessage } from './utils.js';
import { renderWithBeautifier, getActiveTemplateData } from './beautifier.js';
import { parseCapturedSections, dedentMarkdown } from './markdown-render-core.js';

let markdownConverter = null;

function getMarkdownDependencies() {
    const showdown = hostLib.showdown;
    const DOMPurify = hostLib.DOMPurify;
    if (typeof showdown?.Converter !== 'function' || typeof DOMPurify?.sanitize !== 'function') {
        throw new Error('宿主未提供可用的 Showdown 或 DOMPurify');
    }
    if (!markdownConverter) {
        markdownConverter = new showdown.Converter({
            tables: true,
            simpleLineBreaks: true,
            strikethrough: true,
            emoji: true,
        });
    }
    return { markdownConverter, DOMPurify };
}

function releaseBeautifierResources($content) {
    const $iframe = $content.find('.tamako-beautifier-frame');
    if ($iframe.length && $iframe[0]._blobUrl) {
        URL.revokeObjectURL($iframe[0]._blobUrl);
        $iframe[0]._blobUrl = null;
    }
}

function renderEmptyState($content) {
    releaseBeautifierResources($content);
    $content.css('position', '').empty().html(`
        <div class="tamako-empty">
            <span class="icon">${ICONS.sparkle}</span>
            <span class="message">${getDeraMessage('empty')}</span>
        </div>
    `);
}

function appendFallback(container, content) {
    const fallback = document.createElement('div');
    fallback.className = 'tamako-plot-fallback';
    fallback.textContent = content;
    container.appendChild(fallback);
}

function wrapTables(container) {
    for (const table of [...container.querySelectorAll('table')]) {
        if (table.parentElement?.classList.contains('tamako-table-scroll')) continue;
        const wrapper = document.createElement('div');
        wrapper.className = 'tamako-table-scroll';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    }
}

function renderMarkdown($content, content) {
    $content.css('position', '');
    releaseBeautifierResources($content);
    $content.empty();

    const root = document.createElement('div');
    root.className = 'tamako-plot-content tamako-markdown';
    $content[0]?.appendChild(root);

    const parsed = parseCapturedSections(content);
    if (!parsed.ok) {
        appendFallback(root, content);
        return;
    }

    for (const section of parsed.sections) {
        const sectionElement = document.createElement('section');
        sectionElement.className = 'tamako-markdown-section';
        const title = document.createElement('div');
        title.className = 'tamako-markdown-section-title';
        title.textContent = section.tagName;
        sectionElement.appendChild(title);

        const body = document.createElement('div');
        body.className = 'tamako-markdown-section-body';
        try {
            const { markdownConverter: converter, DOMPurify } = getMarkdownDependencies();
            const html = converter.makeHtml(dedentMarkdown(section.innerContent));
            body.innerHTML = DOMPurify.sanitize(html);
            wrapTables(body);
        } catch (error) {
            console.error('[玉子市场] Markdown 渲染失败，已安全降级:', error);
            body.replaceChildren();
            appendFallback(body, section.innerContent);
        }
        sectionElement.appendChild(body);
        root.appendChild(sectionElement);
    }
}

export function updateCurrentContent(content, rawMessage) {
    const $content = $('#tamako-market-window .tamako-content[data-content="current"]');
    const settings = getSettings();

    if (!content?.trim()) {
        renderEmptyState($content);
        return;
    }

    if (settings.beautifier?.enabled && settings.beautifier?.activeTemplateId) {
        const templateData = getActiveTemplateData();
        if (templateData && rawMessage) {
            if (renderWithBeautifier($content, rawMessage, templateData)) {
                return;
            }
        }
    }

    renderMarkdown($content, content);
}
