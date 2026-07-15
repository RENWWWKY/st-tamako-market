import test from 'node:test';
import assert from 'node:assert/strict';

import {
    clearTagRegexCache,
    extractTagContent,
    extractPlotContent,
    extractAMCodes,
    filterPlots,
    normalizeCaptureTags,
} from '../modules/capture-core.js';

test('extractTagContent 能提取指定标签内容', () => {
    clearTagRegexCache();
    const message = '以上是用户的本轮输入\n<plot>剧情一</plot>\n<plot>剧情二</plot>';
    const matches = extractTagContent(message, 'plot');

    assert.deepEqual(matches, ['<plot>剧情一</plot>', '<plot>剧情二</plot>']);
});

test('extractTagContent 不提取反引号中的伪标签', () => {
    clearTagRegexCache();
    const message = '以上是用户的本轮输入\n`<plot>伪标签</plot>`\n<plot>真实标签</plot>';
    const matches = extractTagContent(message, 'plot');

    assert.deepEqual(matches, ['<plot>真实标签</plot>']);
});

test('extractPlotContent 在 extensionEnabled 为 false 时返回 null', () => {
    const settings = { autoCapture: true, captureTags: ['plot'] };
    const message = '以上是用户的本轮输入\n<plot>剧情</plot>';

    assert.equal(extractPlotContent(message, settings, false), null);
});

test('extractPlotContent 在 autoCapture 为 false 时返回 null', () => {
    const settings = { autoCapture: false, captureTags: ['plot'] };
    const message = '以上是用户的本轮输入\n<plot>剧情</plot>';

    assert.equal(extractPlotContent(message, settings, true), null);
});

test('extractPlotContent 在 captureTags 为空时返回 null', () => {
    const settings = { autoCapture: true, captureTags: [] };
    const message = '以上是用户的本轮输入\n<plot>剧情</plot>';

    assert.equal(extractPlotContent(message, settings, true), null);
});

test('extractPlotContent 在缺少关键词门槛时返回 null', () => {
    const settings = { autoCapture: true, captureTags: ['plot'] };
    const message = '<plot>剧情</plot>';

    assert.equal(extractPlotContent(message, settings, true), null);
});

test('extractPlotContent 在满足条件时返回拼接后的标签内容', () => {
    const settings = { autoCapture: true, captureTags: ['plot', 'prologue'] };
    const message = '以上是用户的本轮输入\n<plot>剧情</plot>\n<prologue>序章</prologue>';

    assert.deepEqual(extractPlotContent(message, settings, true), {
        content: '<plot>剧情</plot>\n\n<prologue>序章</prologue>',
        rawMessage: message,
        sourceKind: 'mes',
    });
});

test('extractPlotContent 对 qrf_plot 绕过关键词门槛并优先于 mes', () => {
    const settings = { autoCapture: true, captureTags: ['plot'] };
    const message = {
        is_user: true,
        qrf_plot: '<plot>权威内容</plot>',
        mes: '以上是用户的本轮输入\n<plot>回退内容</plot>',
    };

    assert.deepEqual(extractPlotContent(message, settings, true), {
        content: '<plot>权威内容</plot>',
        rawMessage: '<plot>权威内容</plot>',
        sourceKind: 'qrf_plot',
    });
});

test('有效 qrf_plot 无目标标签时不回退 mes', () => {
    const settings = { autoCapture: true, captureTags: ['plot'] };
    const message = {
        is_user: true,
        qrf_plot: '<recall>无目标标签</recall>',
        mes: '以上是用户的本轮输入\n<plot>不得捕获</plot>',
    };
    assert.equal(extractPlotContent(message, settings, true), null);
});

test('标签边界不误匹配前缀标签，非法和重复标签被规范化', () => {
    assert.deepEqual(normalizeCaptureTags([' plot ', 'PLOT', 'bad tag', 'scene_direction']), ['plot', 'scene_direction']);
    assert.deepEqual(extractTagContent('<plotExtra>错误</plotExtra><plot>正确</plot>', 'plot'), ['<plot>正确</plot>']);
});

test('extractAMCodes 提取、去重并标准化 AM 编号', () => {
    const content = 'AM0001 和 am0001，以及 AM0002';
    assert.deepEqual(extractAMCodes(content), ['AM0001', 'AM0002']);
});

test('filterPlots 支持正文关键词过滤', () => {
    const plots = [
        { content: '这是第一段剧情 AM0001' },
        { content: '第二段测试内容' },
    ];

    assert.deepEqual(filterPlots(plots, '第一段'), [{ content: '这是第一段剧情 AM0001' }]);
});

test('filterPlots 支持 AM 编号过滤', () => {
    const plots = [
        { content: '这是第一段剧情 AM0001' },
        { content: '第二段测试内容 AM0002' },
    ];

    assert.deepEqual(filterPlots(plots, 'am0002'), [{ content: '第二段测试内容 AM0002' }]);
});
