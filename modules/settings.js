// modules/settings.js
/**
 * 玉子市场 - 设置访问层
 * @version 2.8.6
 *
 * 统一处理：默认值、迁移、规范化、持久化与受控更新
 */

import { extensionName, defaultSettings, defaultCustomTheme } from './constants.js';
import { normalizeCaptureTags } from './capture-core.js';

const DEFAULT_THEME_NAME = 'night';
const DEFAULT_TEMPLATE_NAME = '迁移的模板';
const MIN_SCAN_MESSAGES = 10;
const MAX_SCAN_MESSAGES = 500;
const MIN_STORED_PLOTS = 10;
const MAX_STORED_PLOTS = 200;

function cloneValue(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createDefaultSettings() {
    return cloneValue(defaultSettings);
}

export function generateTemplateId() {
    return 'tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function normalizeFiniteNumber(value, fallback = null) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeBoundedInteger(value, fallback, min, max) {
    const num = parseInt(value, 10);
    if (!Number.isFinite(num)) {
        return fallback;
    }
    return Math.max(min, Math.min(max, num));
}

function normalizePositiveNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
}

function normalizeStringArray(value, fallback = []) {
    if (!Array.isArray(value)) {
        return [...fallback];
    }

    return value
        .map(item => typeof item === 'string' ? item.trim() : '')
        .filter(Boolean);
}

function normalizeThemeName(themeName) {
    return themeName === 'custom' ? 'custom' : DEFAULT_THEME_NAME;
}

function normalizeColorValue(value, fallback) {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeCustomTheme(theme) {
    if (!theme || typeof theme !== 'object') {
        return null;
    }

    const normalized = cloneValue(defaultCustomTheme);
    const colors = theme.colors && typeof theme.colors === 'object' ? theme.colors : {};
    const buttonSize = Number(theme.buttonSize);

    normalized.name = typeof theme.name === 'string' && theme.name.trim()
        ? theme.name.trim()
        : defaultCustomTheme.name;
    normalized.basedOn = typeof theme.basedOn === 'string' && theme.basedOn.trim()
        ? theme.basedOn.trim()
        : defaultCustomTheme.basedOn;
    normalized.colors = {
        primary: normalizeColorValue(colors.primary, defaultCustomTheme.colors.primary),
        secondary: normalizeColorValue(colors.secondary, defaultCustomTheme.colors.secondary),
        bg: normalizeColorValue(colors.bg, defaultCustomTheme.colors.bg),
        surface: normalizeColorValue(colors.surface, defaultCustomTheme.colors.surface),
        surfaceAlt: normalizeColorValue(colors.surfaceAlt, defaultCustomTheme.colors.surfaceAlt),
        text: normalizeColorValue(colors.text, defaultCustomTheme.colors.text),
        textMuted: normalizeColorValue(colors.textMuted, defaultCustomTheme.colors.textMuted),
        border: normalizeColorValue(colors.border, defaultCustomTheme.colors.border),
    };
    normalized.opacity = normalizeBoundedInteger(theme.opacity, defaultCustomTheme.opacity, 50, 100);
    normalized.fontFamily = typeof theme.fontFamily === 'string' && theme.fontFamily.trim()
        ? theme.fontFamily.trim()
        : defaultCustomTheme.fontFamily;
    normalized.buttonShape = theme.buttonShape === 'circle' ? 'circle' : 'bar';
    normalized.buttonSize = Number.isFinite(buttonSize)
        ? Math.max(0.6, Math.min(1.5, buttonSize))
        : defaultCustomTheme.buttonSize;
    normalized.buttonImage = typeof theme.buttonImage === 'string' && theme.buttonImage
        ? theme.buttonImage
        : null;

    return normalized;
}

function normalizeTemplateEntry(template) {
    if (!template || typeof template !== 'object') {
        return null;
    }

    const content = typeof template.template === 'string' ? template.template : '';
    if (!content.trim()) {
        return null;
    }

    return {
        id: typeof template.id === 'string' && template.id.trim() ? template.id : generateTemplateId(),
        name: typeof template.name === 'string' && template.name.trim() ? template.name.trim() : '未命名模板',
        template: content,
        createdAt: Number.isFinite(template.createdAt) ? template.createdAt : Date.now(),
    };
}

function normalizeBeautifierSettings(beautifier) {
    const normalized = cloneValue(defaultSettings.beautifier);

    if (!beautifier || typeof beautifier !== 'object') {
        return normalized;
    }

    normalized.enabled = Boolean(beautifier.enabled);

    const templates = Array.isArray(beautifier.templates)
        ? beautifier.templates.map(normalizeTemplateEntry).filter(Boolean)
        : [];

    if (templates.length > 0) {
        normalized.templates = templates;
    } else if (typeof beautifier.template === 'string' && beautifier.template.trim()) {
        const migratedTemplate = normalizeTemplateEntry({
            id: generateTemplateId(),
            name: typeof beautifier.fileName === 'string' && beautifier.fileName.trim()
                ? beautifier.fileName.trim()
                : DEFAULT_TEMPLATE_NAME,
            template: beautifier.template,
            createdAt: Date.now(),
        });

        if (migratedTemplate) {
            normalized.templates = [migratedTemplate];
        }
    }

    const requestedActiveId = typeof beautifier.activeTemplateId === 'string' && beautifier.activeTemplateId.trim()
        ? beautifier.activeTemplateId
        : null;

    normalized.activeTemplateId = normalized.templates.some(template => template.id === requestedActiveId)
        ? requestedActiveId
        : (normalized.templates[0]?.id ?? null);

    return normalized;
}

export function normalizeSettingsShape(settings) {
    const defaults = createDefaultSettings();
    const source = settings && typeof settings === 'object' ? settings : {};

    return {
        enabled: source.enabled !== false,
        windowX: normalizeFiniteNumber(source.windowX, null),
        windowY: normalizeFiniteNumber(source.windowY, null),
        windowWidth: normalizePositiveNumber(source.windowWidth, defaults.windowWidth),
        windowHeight: normalizePositiveNumber(source.windowHeight, defaults.windowHeight),
        autoCapture: source.autoCapture !== false,
        captureTags: normalizeCaptureTags(source.captureTags, defaults.captureTags),
        theme: normalizeThemeName(source.theme),
        maxScanMessages: normalizeBoundedInteger(source.maxScanMessages, defaults.maxScanMessages, MIN_SCAN_MESSAGES, MAX_SCAN_MESSAGES),
        maxStoredPlots: normalizeBoundedInteger(source.maxStoredPlots, defaults.maxStoredPlots, MIN_STORED_PLOTS, MAX_STORED_PLOTS),
        toggleX: normalizeFiniteNumber(source.toggleX, null),
        toggleY: normalizeFiniteNumber(source.toggleY, null),
        hideToggleButton: source.hideToggleButton === true,
        remoteVersion: typeof source.remoteVersion === 'string' ? source.remoteVersion.trim() : defaults.remoteVersion,
        remoteVersionCheckedAt: normalizeFiniteNumber(source.remoteVersionCheckedAt, defaults.remoteVersionCheckedAt),
        beautifier: normalizeBeautifierSettings(source.beautifier),
        customTheme: normalizeCustomTheme(source.customTheme),
    };
}

function getSettingsContainer() {
    try {
        const context = SillyTavern?.getContext?.();
        if (!context) {
            return null;
        }

        if (!context.extensionSettings || typeof context.extensionSettings !== 'object') {
            context.extensionSettings = {};
        }

        return context.extensionSettings;
    } catch (error) {
        console.warn('[玉子市场] 无法访问扩展设置上下文:', error);
        return null;
    }
}

function areSettingsEqual(left, right) {
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch (error) {
        return false;
    }
}

function requestSettingsSave() {
    try {
        SillyTavern?.getContext?.()?.saveSettingsDebounced?.();
    } catch (error) {
        console.warn('[玉子市场] 请求设置保存失败:', error);
    }
}

export function ensureSettings() {
    const container = getSettingsContainer();
    const normalized = normalizeSettingsShape(container?.[extensionName]);

    if (!container) {
        return normalized;
    }

    if (!areSettingsEqual(container[extensionName], normalized)) {
        container[extensionName] = normalized;
    }

    return container[extensionName];
}

export function getSettings() {
    return cloneValue(ensureSettings());
}

export function replaceSettings(nextSettings) {
    const normalized = normalizeSettingsShape(nextSettings);
    const container = getSettingsContainer();

    if (container) {
        container[extensionName] = normalized;
        requestSettingsSave();
    }

    return cloneValue(normalized);
}

export function updateSettings(mutator) {
    const draft = getSettings();

    if (typeof mutator === 'function') {
        const result = mutator(draft);
        return replaceSettings(result && result !== draft ? result : draft);
    }

    return replaceSettings(draft);
}

export function getSetting(key, fallback = undefined) {
    const settings = getSettings();
    return settings[key] ?? fallback;
}

export function saveSetting(key, value) {
    return updateSettings(settings => {
        settings[key] = cloneValue(value);
    });
}

export function updateBeautifierSettings(mutator) {
    return updateSettings(settings => {
        const draft = cloneValue(settings.beautifier);
        const result = typeof mutator === 'function' ? mutator(draft) : draft;
        settings.beautifier = normalizeBeautifierSettings(result && result !== draft ? result : draft);
    });
}
