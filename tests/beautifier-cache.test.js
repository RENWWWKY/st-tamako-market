import test from 'node:test';
import assert from 'node:assert/strict';

import { buildValueSignature, buildChatDataSignature } from '../modules/beautifier-cache.js';

test('buildValueSignature 对空值返回稳定签名', () => {
    assert.equal(buildValueSignature(null), '0:0');
    assert.equal(buildValueSignature(undefined), '0:0');
    assert.equal(buildValueSignature(''), '0:0');
});

test('buildValueSignature 对相同输入返回相同签名', () => {
    const value = '以上是用户的本轮输入 <plot>测试内容</plot>';
    assert.equal(buildValueSignature(value), buildValueSignature(value));
});

test('buildValueSignature 对不同输入返回不同签名', () => {
    const a = '以上是用户的本轮输入 <plot>测试内容A</plot>';
    const b = '以上是用户的本轮输入 <plot>测试内容B</plot>';
    assert.notEqual(buildValueSignature(a), buildValueSignature(b));
});

test('buildChatDataSignature 对空聊天返回固定签名', () => {
    assert.equal(buildChatDataSignature([]), 'empty');
    assert.equal(buildChatDataSignature(null), 'empty');
});

test('buildChatDataSignature 忽略助手楼变化', () => {
    const chatA = [{ is_user: true, mes: 'A' }];
    const chatB = [{ is_user: true, mes: 'A' }, { is_user: false, mes: 'B' }];

    assert.equal(buildChatDataSignature(chatA), buildChatDataSignature(chatB));
});

test('buildChatDataSignature 在消息内容变化时签名变化', () => {
    const chatA = [{ is_user: true, mes: '剧情一' }];
    const chatB = [{ is_user: true, mes: '剧情二' }];

    assert.notEqual(buildChatDataSignature(chatA), buildChatDataSignature(chatB));
});

test('buildChatDataSignature 以有效 qrf_plot 为权威来源', () => {
    const chatA = [{
        is_user: true,
        mes: '回退消息 A',
        qrf_plot: '<plot>固定权威内容</plot>',
    }];
    const chatB = [{
        is_user: true,
        mes: '回退消息 B',
        qrf_plot: '<plot>固定权威内容</plot>',
    }];

    assert.equal(buildChatDataSignature(chatA), buildChatDataSignature(chatB));
});

test('buildChatDataSignature 不读取禁用字段 getter', () => {
    const message = { is_user: true, mes: '固定消息' };
    Object.defineProperty(message, 'extra', {
        get() { throw new Error('不得读取 extra'); },
    });
    Object.defineProperty(message, 'swipes', {
        get() { throw new Error('不得读取 swipes'); },
    });

    assert.doesNotThrow(() => buildChatDataSignature([message]));
});

test('buildChatDataSignature 在权威来源类型切换时签名变化', () => {
    const mes = [{ is_user: true, mes: '<plot>相同文本</plot>' }];
    const qrf = [{ is_user: true, mes: '回退', qrf_plot: '<plot>相同文本</plot>' }];
    assert.notEqual(buildChatDataSignature(mes), buildChatDataSignature(qrf));
});
