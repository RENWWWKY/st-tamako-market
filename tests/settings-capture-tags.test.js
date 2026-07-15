import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultSettings } from '../modules/constants.js';
import { normalizeSettingsShape } from '../modules/settings.js';

test('默认 captureTags 保持 recall 与 scene_direction', () => {
    assert.deepEqual(defaultSettings.captureTags, ['recall', 'scene_direction']);
    assert.deepEqual(normalizeSettingsShape({}).captureTags, ['recall', 'scene_direction']);
});

test('用户自定义 captureTags 被规范化但不被默认值覆盖', () => {
    assert.deepEqual(
        normalizeSettingsShape({ captureTags: [' story_line ', 'STORY_LINE', 'fubi', 'bad tag'] }).captureTags,
        ['story_line', 'fubi'],
    );
    assert.deepEqual(normalizeSettingsShape({ captureTags: [] }).captureTags, []);
});
