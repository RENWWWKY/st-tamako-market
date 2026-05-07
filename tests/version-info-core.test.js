import test from 'node:test';
import assert from 'node:assert/strict';

import {
    compareVersions,
    createVersionNoticeState,
    getVersionHistorySince,
} from '../modules/version-info-core.js';

const history = [
    { version: '2.9.3', title: '后续版本', notes: ['2.9.3 note'] },
    { version: '2.9.2', title: '设置页更新提示', notes: ['2.9.2 note'] },
    { version: '2.9.1', title: 'Quick Reply 联动', notes: ['2.9.1 note'] },
    { version: '2.9.0', title: '重构', notes: ['2.9.0 note'] },
];

test('compareVersions 能比较语义版本号', () => {
    assert.equal(compareVersions('2.9.2', '2.9.1'), 1);
    assert.equal(compareVersions('2.9.0', '2.9.1'), -1);
    assert.equal(compareVersions('v2.9.2', '2.9.2'), 0);
});

test('createVersionNoticeState 本地版本等于远端版本时不显示 NEW', () => {
    const state = createVersionNoticeState('2.9.2', '2.9.2');

    assert.equal(state.shouldShowBadge, false);
    assert.equal(state.localVersion, '2.9.2');
    assert.equal(state.latestVersion, '2.9.2');
});

test('createVersionNoticeState 本地版本低于远端版本时显示 NEW', () => {
    const stateFrom290 = createVersionNoticeState('2.9.0', '2.9.2');
    const stateFrom291 = createVersionNoticeState('2.9.1', '2.9.2');

    assert.equal(stateFrom290.shouldShowBadge, true);
    assert.equal(stateFrom290.notesFromVersion, '2.9.0');
    assert.equal(stateFrom290.notesToVersion, '2.9.2');
    assert.equal(stateFrom291.shouldShowBadge, true);
    assert.equal(stateFrom291.notesFromVersion, '2.9.1');
    assert.equal(stateFrom291.notesToVersion, '2.9.2');
});

test('createVersionNoticeState 未拿到远端版本时保守不显示 NEW', () => {
    const state = createVersionNoticeState('2.9.2', '');

    assert.equal(state.shouldShowBadge, false);
    assert.equal(state.localVersion, '2.9.2');
    assert.equal(state.latestVersion, '2.9.2');
});

test('getVersionHistorySince 返回从本地版本之后到远端版本的累计说明', () => {
    assert.deepEqual(
        getVersionHistorySince(history, '2.9.0', '2.9.2').map(entry => entry.version),
        ['2.9.2', '2.9.1'],
    );
});

test('getVersionHistorySince 从 2.9.1 升级只显示 2.9.2', () => {
    assert.deepEqual(
        getVersionHistorySince(history, '2.9.1', '2.9.2').map(entry => entry.version),
        ['2.9.2'],
    );
});

test('getVersionHistorySince 本地已是 2.9.2 时不显示任何累计更新', () => {
    assert.deepEqual(
        getVersionHistorySince(history, '2.9.2', '2.9.2').map(entry => entry.version),
        [],
    );
});
