import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../modules/window-content.js', import.meta.url), 'utf8');

function readFunctionBlock(name, nextMarker) {
    const start = source.indexOf(`function ${name}`);
    const end = source.indexOf(nextMarker, start);
    assert.notEqual(start, -1, `缺少 ${name}`);
    assert.notEqual(end, -1, `无法确定 ${name} 结束边界`);
    return source.slice(start, end);
}

test('普通 Markdown 路径保持 section、dedent、转换、净化、插 DOM 的安全顺序', () => {
    const block = readFunctionBlock('renderMarkdown', 'export function updateCurrentContent');
    const parseIndex = block.indexOf('parseCapturedSections(content)');
    const dependencyIndex = block.indexOf('getMarkdownDependencies()');
    const convertIndex = block.indexOf('converter.makeHtml');
    const wrapIndex = block.indexOf('wrapTables(body)');

    for (const index of [parseIndex, dependencyIndex, convertIndex, wrapIndex]) {
        assert.notEqual(index, -1);
    }
    assert.match(block, /converter\.makeHtml\(dedentMarkdown\(section\.innerContent\)\)/);
    assert.match(block, /body\.innerHTML\s*=\s*DOMPurify\.sanitize\(html\)/);
    assert.ok(dependencyIndex < convertIndex && convertIndex < wrapIndex);
    assert.match(block, /title\.textContent\s*=\s*section\.tagName/);
    assert.match(block, /body\.replaceChildren\(\)[\s\S]*appendFallback\(body, section\.innerContent\)/);
});

test('Markdown 依赖和 Converter 在渲染期校验与惰性初始化，避免顶层构造失败', () => {
    const dependencyBlock = readFunctionBlock('getMarkdownDependencies', 'function releaseBeautifierResources');
    const modulePrefix = source.slice(0, source.indexOf('function getMarkdownDependencies'));

    assert.match(source, /import \* as hostLib from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\.js['"]/);
    assert.match(dependencyBlock, /typeof showdown\?\.Converter !== ['"]function['"]/);
    assert.match(dependencyBlock, /typeof DOMPurify\?\.sanitize !== ['"]function['"]/);
    assert.match(dependencyBlock, /markdownConverter = new showdown\.Converter/);
    assert.doesNotMatch(modulePrefix, /new showdown\.Converter/);
});

test('普通渲染失败使用 textContent，表格逐张包装到受限滚动容器', () => {
    const fallbackBlock = readFunctionBlock('appendFallback', 'function wrapTables');
    const tableBlock = readFunctionBlock('wrapTables', 'function renderMarkdown');

    assert.match(fallbackBlock, /fallback\.textContent\s*=\s*content/);
    assert.doesNotMatch(fallbackBlock, /innerHTML|\.html\s*\(/);
    assert.match(tableBlock, /querySelectorAll\(['"]table['"]\)/);
    assert.match(tableBlock, /wrapper\.className\s*=\s*['"]tamako-table-scroll['"]/);
    assert.match(tableBlock, /wrapper\.appendChild\(table\)/);
});

test('美化器成功时继续短路，普通 Markdown 仅作为回退路径', () => {
    const start = source.indexOf('export function updateCurrentContent');
    const block = source.slice(start);
    const beautifierIndex = block.indexOf('renderWithBeautifier');
    const returnIndex = block.indexOf('return;', beautifierIndex);
    const markdownIndex = block.indexOf('renderMarkdown($content, content)');

    assert.ok(beautifierIndex >= 0);
    assert.ok(beautifierIndex < returnIndex);
    assert.ok(returnIndex < markdownIndex);
});
