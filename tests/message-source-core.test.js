import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveUserMessageSource, projectUserMessage } from '../modules/message-source-core.js';

test('resolver 仅接受用户楼并优先返回原始 qrf_plot', () => {
    assert.equal(resolveUserMessageSource({ is_user: false, qrf_plot: 'x' }), null);
    const message = { is_user: true, qrf_plot: '  <recall>qrf</recall>  ', mes: '<recall>mes</recall>' };
    assert.deepEqual(resolveUserMessageSource(message), {
        kind: 'qrf_plot',
        text: '  <recall>qrf</recall>  ',
        authoritative: true,
    });
});

test('resolver 在 qrf_plot 无效时回退非空 mes', () => {
    for (const qrf_plot of [undefined, null, '', '   ', 42]) {
        assert.deepEqual(resolveUserMessageSource({ is_user: true, qrf_plot, mes: ' mes ' }), {
            kind: 'mes',
            text: ' mes ',
            authoritative: false,
        });
    }
});

test('resolver 与投影不读取禁用字段', () => {
    const message = { is_user: true, mes: '正文' };
    Object.defineProperty(message, 'extra', { get() { throw new Error('extra'); } });
    Object.defineProperty(message, 'swipes', { get() { throw new Error('swipes'); } });
    assert.doesNotThrow(() => resolveUserMessageSource(message));
    assert.deepEqual(projectUserMessage(message), {
        is_user: true,
        sourceKind: 'mes',
        content: '正文',
        mes: '正文',
        qrf_plot: '',
    });
});
