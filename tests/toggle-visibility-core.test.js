import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowToggleButton } from '../modules/toggle-visibility-core.js';

test('shouldShowToggleButton 默认显示悬浮按钮', () => {
    assert.equal(shouldShowToggleButton({}), true);
    assert.equal(shouldShowToggleButton(null), true);
});

test('shouldShowToggleButton 在扩展禁用时隐藏按钮', () => {
    assert.equal(shouldShowToggleButton({ enabled: false, hideToggleButton: false }), false);
});

test('shouldShowToggleButton 在用户隐藏按钮时隐藏按钮', () => {
    assert.equal(shouldShowToggleButton({ enabled: true, hideToggleButton: true }), false);
});

test('shouldShowToggleButton 只有明确 hideToggleButton 为 true 才隐藏', () => {
    assert.equal(shouldShowToggleButton({ enabled: true, hideToggleButton: false }), true);
    assert.equal(shouldShowToggleButton({ enabled: true, hideToggleButton: undefined }), true);
});
