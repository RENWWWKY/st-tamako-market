import test from 'node:test';
import assert from 'node:assert/strict';

import { EventAliases, EventListenerManager, resolveMessageEventIndex } from '../modules/events.js';

test('resolveMessageEventIndex 解析安全整数、数字字符串和白名单字段', () => {
    const chat = [{ mes: 'a' }, { mes: 'b' }];
    assert.equal(resolveMessageEventIndex([1], chat), 1);
    assert.equal(resolveMessageEventIndex(['0'], chat), 0);
    assert.equal(resolveMessageEventIndex([{ messageIndex: '1' }], chat), 1);
    assert.equal(resolveMessageEventIndex([{ message: chat[0] }], chat), 0);
    assert.equal(resolveMessageEventIndex([-1, '01', { index: 9 }], chat), null);
});

test('message_updated 包含完整更新别名', () => {
    assert.deepEqual(EventAliases.message_updated, [
        'message_updated', 'MESSAGE_UPDATED', 'message_edited', 'MESSAGE_EDITED',
    ]);
});

test('EventListenerManager 按实际注册别名集合注销', () => {
    const registered = [];
    const removed = [];
    const source = {
        on(type) { if (type === 'MESSAGE_UPDATED') throw new Error('unsupported'); registered.push(type); },
        off(type) { removed.push(type); },
    };
    const manager = new EventListenerManager();
    manager.register(source, 'message_updated', () => {}, { useAlias: true });
    manager.clearAll();
    assert.deepEqual(removed, registered);
    assert.equal(removed.includes('MESSAGE_UPDATED'), false);
});
