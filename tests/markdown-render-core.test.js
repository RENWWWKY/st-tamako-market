import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCapturedSections, dedentMarkdown } from '../modules/markdown-render-core.js';

test('parseCapturedSections 保持 section 顺序并支持属性与重复标签', () => {
    const parsed = parseCapturedSections('<recall type="x">一</recall>\n\n<recall>二</recall>');
    assert.deepEqual(parsed, {
        ok: true,
        sections: [
            { tagName: 'recall', innerContent: '一' },
            { tagName: 'recall', innerContent: '二' },
        ],
    });
});

test('parseCapturedSections 对未闭合和同名嵌套安全降级', () => {
    assert.equal(parseCapturedSections('<recall>未闭合').ok, false);
    assert.equal(parseCapturedSections('<recall><recall>嵌套</recall></recall>').ok, false);
});

test('dedentMarkdown 消除公共缩进并保留相对缩进', () => {
    const input = '        ### 标题\r\n        - 项目\r\n            - 子项\r\n        | A | B |\r\n        |---|---|';
    assert.equal(dedentMarkdown(input), '### 标题\n- 项目\n    - 子项\n| A | B |\n|---|---|');
});

test('dedentMarkdown 对无公共缩进与空白正文保持稳定', () => {
    assert.equal(dedentMarkdown('正文\n    代码'), '正文\n    代码');
    assert.equal(dedentMarkdown('   \n\t'), '   \n\t');
});
