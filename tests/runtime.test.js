import test from 'node:test';
import assert from 'node:assert/strict';

import { createRuntimeController } from '../modules/runtime.js';
import { extensionName } from '../modules/constants.js';
import { getCapturedPlots, setCapturedPlots, setExtensionEnabled } from '../modules/state.js';

const settings = {
    enabled: true,
    autoCapture: true,
    captureTags: ['plot'],
    maxScanMessages: 50,
    maxStoredPlots: 50,
};

function createFakeClock(startAt = 1000) {
    let now = startAt;
    let nextId = 1;
    const tasks = new Map();
    const original = {
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        dateNow: Date.now,
    };

    globalThis.setTimeout = (callback, delay = 0) => {
        const id = nextId++;
        tasks.set(id, { id, at: now + Math.max(0, Number(delay) || 0), callback });
        return id;
    };
    globalThis.clearTimeout = id => tasks.delete(id);
    Date.now = () => now;

    function advance(milliseconds) {
        const target = now + milliseconds;
        while (true) {
            const due = [...tasks.values()]
                .filter(task => task.at <= target)
                .sort((left, right) => left.at - right.at || left.id - right.id)[0];
            if (!due) break;
            tasks.delete(due.id);
            now = due.at;
            due.callback();
        }
        now = target;
    }

    return {
        advance,
        pendingCount: () => tasks.size,
        restore() {
            tasks.clear();
            globalThis.setTimeout = original.setTimeout;
            globalThis.clearTimeout = original.clearTimeout;
            Date.now = original.dateNow;
        },
    };
}

function createEventSource() {
    const handlers = new Map();
    return {
        on(type, handler) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type).add(handler);
        },
        off(type, handler) {
            handlers.get(type)?.delete(handler);
        },
        emit(type, ...args) {
            for (const handler of [...(handlers.get(type) || [])]) handler(...args);
        },
        handlers(type) {
            return [...(handlers.get(type) || [])];
        },
    };
}

function installEnvironment(initialChat, options = {}) {
    const clock = createFakeClock();
    const eventSource = createEventSource();
    const environment = { chat: initialChat, contextReads: 0, observers: [], containerAvailable: options.containerAvailable !== false, observeFailures: options.observeFailures || 0 };
    const original = {
        SillyTavern: globalThis.SillyTavern,
        document: globalThis.document,
        MutationObserver: globalThis.MutationObserver,
    };

    globalThis.SillyTavern = {
        getContext() {
            environment.contextReads++;
            return {
                chat: environment.chat,
                eventSource,
                extensionSettings: { [extensionName]: settings },
                saveSettingsDebounced() {},
            };
        },
    };
    globalThis.document = {
        getElementById: id => id === 'chat' && environment.containerAvailable ? {} : null,
    };
    globalThis.MutationObserver = class {
        constructor(callback) {
            this.callback = callback;
            this.disconnected = false;
            environment.observers.push(this);
        }
        observe() {
            if (environment.observeFailures > 0) {
                environment.observeFailures--;
                throw new Error('observe failed');
            }
        }
        disconnect() { this.disconnected = true; }
    };

    setExtensionEnabled(true);
    setCapturedPlots([]);

    return {
        clock,
        eventSource,
        environment,
        restore() {
            setCapturedPlots([]);
            clock.restore();
            globalThis.SillyTavern = original.SillyTavern;
            globalThis.document = original.document;
            globalThis.MutationObserver = original.MutationObserver;
        },
    };
}

function createCallbacks() {
    const calls = { updates: [], history: 0, newItems: 0 };
    return {
        calls,
        callbacks: {
            onUpdate: (...args) => calls.updates.push(args),
            onHistoryUpdate: () => calls.history++,
            onNewItem: () => calls.newItems++,
        },
    };
}

test('MESSAGE_SENT 在有限重试窗口内将 mes 原位升级为 qrf_plot', () => {
    const chat = [{ is_user: true, mes: '以上是用户的本轮输入\n<plot>mes</plot>' }];
    const fixture = installEnvironment(chat);
    const { calls, callbacks } = createCallbacks();
    const controller = createRuntimeController(callbacks);

    try {
        controller.start();
        fixture.eventSource.emit('message_sent', { messageIndex: 0 });
        fixture.clock.advance(300);

        assert.equal(getCapturedPlots()[0].content, '<plot>mes</plot>');
        assert.equal(getCapturedPlots()[0].sourceKind, 'mes');
        assert.equal(calls.newItems, 1);

        chat[0].qrf_plot = '<plot>qrf</plot>';
        fixture.clock.advance(250);

        assert.equal(getCapturedPlots()[0].content, '<plot>qrf</plot>');
        assert.equal(getCapturedPlots()[0].sourceKind, 'qrf_plot');
        assert.equal(calls.newItems, 1);
        assert.equal(fixture.clock.pendingCount(), 1, 'qrf 出现后只应剩余初始扫描 timer');
        const updateCount = calls.updates.length;

        fixture.clock.advance(1400);
        assert.equal(calls.updates.length, updateCount);
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('晚写重试严格有界，窗口耗尽后的静默 qrf 需由后续明确事件恢复', () => {
    const chat = [{ is_user: true, mes: '以上是用户的本轮输入\n<plot>mes</plot>' }];
    const fixture = installEnvironment(chat);
    const controller = createRuntimeController();

    try {
        controller.start();
        fixture.eventSource.emit('user_message_rendered', 0);
        fixture.clock.advance(200);
        assert.equal(getCapturedPlots()[0].sourceKind, 'mes');

        fixture.clock.advance(1800);
        assert.equal(fixture.clock.pendingCount(), 0);

        chat[0].qrf_plot = '<plot>窗口后写入</plot>';
        fixture.clock.advance(5000);
        assert.equal(getCapturedPlots()[0].sourceKind, 'mes');

        fixture.eventSource.emit('message_updated', 0);
        fixture.clock.advance(0);
        assert.equal(getCapturedPlots()[0].content, '<plot>窗口后写入</plot>');
        assert.equal(getCapturedPlots()[0].sourceKind, 'qrf_plot');
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('聊天切换取消旧任务，快速连续切换仍以最后聊天建立代次屏障', () => {
    const chatA = [{ is_user: true, mes: '以上是用户的本轮输入\n<plot>A</plot>' }];
    const chatB = [{ is_user: true, qrf_plot: '<plot>B</plot>' }];
    const chatC = [{ is_user: true, qrf_plot: '<plot>C</plot>' }];
    const fixture = installEnvironment(chatA);
    const { calls, callbacks } = createCallbacks();
    const controller = createRuntimeController(callbacks);

    try {
        controller.start();
        fixture.eventSource.emit('message_sent', 0);

        fixture.environment.chat = chatB;
        fixture.eventSource.emit('chat_changed');
        fixture.clock.advance(100);
        fixture.environment.chat = chatC;
        fixture.eventSource.emit('chat_changed');

        fixture.clock.advance(699);
        assert.deepEqual(getCapturedPlots(), []);
        fixture.clock.advance(101);

        assert.deepEqual(getCapturedPlots().map(plot => plot.content), ['<plot>C</plot>']);
        assert.deepEqual(calls.updates.filter(args => args[0] === ''), [['', '']]);
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('destroy 后 pending timer、已取出的 handler 与 forceScan 均不读取上下文或写 UI', () => {
    const chat = [{ is_user: true, qrf_plot: '<plot>内容</plot>' }];
    const fixture = installEnvironment(chat);
    const { calls, callbacks } = createCallbacks();
    const controller = createRuntimeController(callbacks);

    try {
        controller.start();
        fixture.eventSource.emit('message_sent', 0);
        const staleHandler = fixture.eventSource.handlers('message_updated')[0];
        controller.destroy();

        const readsAfterDestroy = fixture.environment.contextReads;
        const updatesAfterDestroy = calls.updates.length;
        staleHandler?.(0);
        controller.forceScan();
        fixture.clock.advance(5000);

        assert.equal(fixture.environment.contextReads, readsAfterDestroy);
        assert.equal(calls.updates.length, updatesAfterDestroy);
        assert.deepEqual(getCapturedPlots(), []);
        assert.equal(fixture.clock.pendingCount(), 0);
        assert.equal(fixture.environment.observers[0].disconnected, true);
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('可靠索引只对账单楼，未知 payload 改走规范范围重建', () => {
    const chat = [
        { is_user: true, qrf_plot: '<plot>一</plot>' },
        { is_user: true, qrf_plot: '<plot>二</plot>' },
    ];
    const fixture = installEnvironment(chat);
    const controller = createRuntimeController();

    try {
        controller.start();
        assert.equal(controller.forceScan(), true);
        chat[0].qrf_plot = '<plot>一改</plot>';
        chat[1].qrf_plot = '<plot>二改</plot>';

        fixture.eventSource.emit('message_updated', { messageIndex: 0 });
        fixture.clock.advance(0);
        assert.deepEqual(getCapturedPlots().map(plot => plot.content), ['<plot>一改</plot>', '<plot>二</plot>']);

        fixture.eventSource.emit('message_updated', { unexpected: true });
        fixture.clock.advance(0);
        assert.deepEqual(getCapturedPlots().map(plot => plot.content), ['<plot>一改</plot>', '<plot>二改</plot>']);
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('同楼事件别名风暴按索引合并，并保留最早执行时刻与晚写重试需求', () => {
    const chat = [{ is_user: true, mes: '以上是用户的本轮输入\n<plot>初始</plot>' }];
    const fixture = installEnvironment(chat);
    const controller = createRuntimeController();

    try {
        controller.start();
        fixture.eventSource.emit('message_sent', 0);
        fixture.eventSource.emit('message_updated', 0);
        fixture.eventSource.emit('MESSAGE_EDITED', { messageIndex: 0 });

        assert.equal(fixture.clock.pendingCount(), 2, '只应保留初始扫描与一份同楼对账任务');
        fixture.clock.advance(0);
        assert.equal(getCapturedPlots()[0].content, '<plot>初始</plot>');
        assert.equal(fixture.clock.pendingCount(), 2, '即时对账后应保留初始扫描与一份晚写重试');

        chat[0].qrf_plot = '<plot>晚写</plot>';
        fixture.clock.advance(250);
        assert.equal(getCapturedPlots()[0].content, '<plot>晚写</plot>');
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('未知 payload 的范围重建合并为单一任务', () => {
    const chat = [{ is_user: true, qrf_plot: '<plot>内容</plot>' }];
    const fixture = installEnvironment(chat);
    const controller = createRuntimeController();

    try {
        controller.start();
        fixture.eventSource.emit('message_updated', { unknown: true });
        fixture.eventSource.emit('MESSAGE_UPDATED', { stillUnknown: true });
        fixture.eventSource.emit('message_edited', null);

        assert.equal(fixture.clock.pendingCount(), 2, '只应保留初始扫描与一份范围重建');
        fixture.clock.advance(0);
        assert.equal(getCapturedPlots()[0].content, '<plot>内容</plot>');
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('结构变化立即废弃旧索引晚写任务，并由规范范围重建恢复', () => {
    const first = { is_user: true, qrf_plot: '<plot>一</plot>' };
    const second = { is_user: true, mes: '以上是用户的本轮输入\n<plot>二</plot>' };
    const fixture = installEnvironment([first, second]);
    const controller = createRuntimeController();

    try {
        controller.start();
        fixture.eventSource.emit('message_sent', 1);
        fixture.clock.advance(300);
        assert.equal(getCapturedPlots().find(plot => plot.messageIndex === 1)?.content, '<plot>二</plot>');

        fixture.environment.chat.splice(0, 1);
        fixture.eventSource.emit('message_deleted', 0);
        fixture.clock.advance(0);

        assert.deepEqual(getCapturedPlots().map(plot => [plot.messageIndex, plot.content]), [[0, '<plot>二</plot>']]);
        fixture.environment.chat[0].qrf_plot = '<plot>二晚写</plot>';
        fixture.clock.advance(2000);
        assert.equal(getCapturedPlots()[0].content, '<plot>二</plot>', '被废弃的旧索引重试不得处理重排后的消息');
    } finally {
        controller.destroy();
        fixture.restore();
    }
});

test('MutationObserver 首次 observe 失败后重试，destroy 后不再重建', () => {
    const fixture = installEnvironment([], { observeFailures: 1 });
    const controller = createRuntimeController();

    try {
        controller.start();
        assert.equal(fixture.environment.observers.length, 1);
        assert.equal(fixture.environment.observers[0].disconnected, true);

        fixture.clock.advance(1000);
        assert.equal(fixture.environment.observers.length, 2);
        assert.equal(fixture.environment.observers[1].disconnected, false);

        controller.destroy();
        fixture.clock.advance(5000);
        assert.equal(fixture.environment.observers.length, 2);
        assert.equal(fixture.environment.observers[1].disconnected, true);
    } finally {
        controller.destroy();
        fixture.restore();
    }
});
