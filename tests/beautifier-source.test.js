import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
    escapeScriptRawText,
    replaceBeautifierPlaceholders,
    extractTagFromChatHistory,
    extractFileFromContentTag,
} from '../modules/beautifier.js';

test('text/plain 的 $1 会编码闭合 script 序列以阻断 raw-text 逃逸', () => {
    const payload = '</script><script>alert(1)</script></ScRiPt>';
    const escaped = escapeScriptRawText(payload);

    assert.equal(escaped, '<\\/script><script>alert(1)<\\/script><\\/script>');
    assert.doesNotMatch(escaped, /<\/script/i);
});

test('美化器占位符按上下文单次替换，不递归展开原文中的 $1', () => {
    const template = '<div data-value="$1">$1</div>'
        + '<script type="text/plain">first:$1</script>'
        + '<script TYPE="text/plain">second:$1</script>';
    const rawMessage = 'a $1 " b=c </script>';
    const result = replaceBeautifierPlaceholders(template, rawMessage);

    assert.match(result, /data-value="a&#32;\$1&#32;&quot;&#32;b&#61;c&#32;&lt;\/script&gt;"/);
    assert.match(result, />a&#32;\$1&#32;&quot;&#32;b&#61;c&#32;&lt;\/script&gt;<\/div>/);
    assert.match(result, /first:a \$1 " b=c <\\\/script>/);
    assert.match(result, /second:a \$1 " b=c <\\\/script>/);
    assert.equal((result.match(/a \$1 " b=c <\\\/script>/g) || []).length, 2);
});

test('普通 $1 会编码属性结构分隔符和 ASCII 空白', () => {
    const result = replaceBeautifierPlaceholders('<div data-x=$1>$1</div>', ' x=`y`\n onerror=alert(1)');

    assert.equal(
        result,
        '<div data-x=&#32;x&#61;&#96;y&#96;&#10;&#32;onerror&#61;alert(1)>&#32;x&#61;&#96;y&#96;&#10;&#32;onerror&#61;alert(1)</div>'
    );
});

test('美化器标签聚合仅处理用户楼与单一权威来源', () => {
    const chat = [
        { is_user: false, qrf_plot: '<recall>助手内容</recall>' },
        {
            is_user: true,
            qrf_plot: '<other>权威但无目标</other>',
            mes: '<recall>不得回退</recall>',
        },
    ];
    assert.equal(extractTagFromChatHistory(chat, 'recall'), '');
});

test('美化器 content/file 聚合不读取禁用字段', () => {
    const message = {
        is_user: true,
        qrf_plot: '<content><file>档案.txt</file></content>',
    };
    Object.defineProperty(message, 'extra', { get() { throw new Error('extra'); } });
    Object.defineProperty(message, 'swipes', { get() { throw new Error('swipes'); } });
    assert.equal(extractFileFromContentTag([message]), '档案.txt');
});

test('注入 getSTChat 不包含父窗口原始聊天回退', () => {
    const source = fs.readFileSync(new URL('../modules/beautifier.js', import.meta.url), 'utf8');
    const start = source.indexOf('window.getSTChat = function()');
    const end = source.indexOf('window.getContext', start);
    const block = source.slice(start, end);
    assert.match(block, /TAMAKO_INJECTED_CHAT/);
    assert.doesNotMatch(block, /window\.parent|SillyTavern|getContext\(\)\.chat/);
});
