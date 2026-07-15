import test from 'node:test';
import assert from 'node:assert/strict';

import { reconcileUserMessage, scanAllMessages } from '../modules/capture.js';
import { getCapturedPlots, setCapturedPlots, setExtensionEnabled } from '../modules/state.js';
import { extensionName } from '../modules/constants.js';

const settings = {
    enabled: true,
    autoCapture: true,
    captureTags: ['plot'],
    maxScanMessages: 50,
    maxStoredPlots: 50,
};

function installChat(chat) {
    globalThis.SillyTavern = {
        getContext() {
            return {
                chat,
                extensionSettings: { [extensionName]: settings },
                saveSettingsDebounced() {},
            };
        },
    };
    setExtensionEnabled(true);
    setCapturedPlots([]);
}

test('reconcileUserMessage 支持新增、mes 到 qrf 原位升级和删除', () => {
    const chat = [{ is_user: true, mes: '以上是用户的本轮输入\n<plot>mes</plot>' }];
    installChat(chat);
    let newItems = 0;
    const callbacks = { onNewItem: () => newItems++ };

    assert.equal(reconcileUserMessage(0, callbacks, settings), true);
    const timestamp = getCapturedPlots()[0].timestamp;
    assert.equal(newItems, 1);
    assert.equal(getCapturedPlots()[0].sourceKind, 'mes');

    chat[0].qrf_plot = '<plot>qrf</plot>';
    assert.equal(reconcileUserMessage(0, callbacks, settings), true);
    assert.equal(getCapturedPlots()[0].content, '<plot>qrf</plot>');
    assert.equal(getCapturedPlots()[0].timestamp, timestamp);
    assert.equal(newItems, 1);

    chat[0].qrf_plot = '<recall>无目标</recall>';
    assert.equal(reconcileUserMessage(0, callbacks, settings), true);
    assert.deepEqual(getCapturedPlots(), []);
});

test('scanAllMessages 规范重建并在空结果时清空 UI', () => {
    const chat = [
        { is_user: true, mes: '以上是用户的本轮输入\n<plot>一</plot>' },
        { is_user: false, mes: '助手' },
        { is_user: true, qrf_plot: '<plot>二</plot>', mes: '回退' },
    ];
    installChat(chat);
    const updates = [];
    assert.equal(scanAllMessages({ onUpdate: (...args) => updates.push(args) }).count, 2);
    assert.deepEqual(getCapturedPlots().map(plot => plot.messageIndex), [0, 2]);

    chat.splice(0, 1);
    scanAllMessages({ onUpdate: (...args) => updates.push(args) });
    assert.deepEqual(getCapturedPlots().map(plot => plot.messageIndex), [1]);
    assert.equal(getCapturedPlots()[0].content, '<plot>二</plot>');

    chat[1].qrf_plot = '<recall>无目标</recall>';
    scanAllMessages({ onUpdate: (...args) => updates.push(args) });
    assert.deepEqual(getCapturedPlots(), []);
    assert.deepEqual(updates.at(-1), ['', '']);
});
