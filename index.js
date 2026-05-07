// index.js
/**
 * 玉子市场 - SillyTavern 悬浮窗扩展
 * @version 2.9.2
 *
 * 更新日志:
 * - v2.9.2: 设置页新增 NEW 标记与当前版本说明弹窗
 * - v2.9.1: 新增 Quick Reply 配套 Slash Command，可通过 QR 打开/关闭窗口
 * - v2.9.1: 新增隐藏悬浮窗按钮设置，支持仅使用 QR 控制窗口
 * - v2.8.6: 规范化事件监听系统，使用 EventListenerManager 统一管理
 * - v2.8.6: 添加 JSDoc 类型注释，提高代码可维护性
 * - v2.8.6: 优化事件清理机制，防止内存泄漏
 */

import { setExtensionEnabled, cleanupAllResources } from './modules/state.js';
import { showDeraToast } from './modules/utils.js';
import { getSettings, saveSetting } from './modules/settings.js';
import { createWindow, toggleWindow, updateCurrentContent, updateHistoryList } from './modules/window.js';
import { createSettingsPanel } from './modules/settings-panel.js';
import { applyToggleButtonVisibility, createToggleButton, removeToggleButton } from './modules/toggle.js';
import { createRuntimeController } from './modules/runtime.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';

// ===== 运行时编排 =====

const EXTENSION_FOLDER_NAME = 'st-tamako-market';
const TAMAKO_SLASH_COMMANDS = [
    {
        name: 'tamako-market-open',
        aliases: ['tamako-open'],
        callback: () => openWindowFromSlashCommand(),
        helpString: '玉子市场：打开悬浮窗。',
    },
    {
        name: 'tamako-market-close',
        aliases: ['tamako-close'],
        callback: () => closeWindowFromSlashCommand(),
        helpString: '玉子市场：关闭悬浮窗。',
    },
    {
        name: 'tamako-market-toggle',
        aliases: ['tamako-toggle'],
        callback: () => toggleWindowFromSlashCommand(),
        helpString: '玉子市场：切换悬浮窗开关状态。',
    },
];
const TAMAKO_SLASH_COMMAND_NAMES = TAMAKO_SLASH_COMMANDS.flatMap(command => [command.name, ...(command.aliases || [])]);

let runtimeController = null;
let settingsPanelTimer = null;
let slashCommandsRegistered = false;

function isOwnedSlashCommand(command) {
    return Boolean(command && (
        command.source === EXTENSION_FOLDER_NAME ||
        (typeof command.helpString === 'string' && command.helpString.startsWith('玉子市场：'))
    ));
}

function canReplaceSlashCommand(commandName) {
    const command = SlashCommandParser.commands?.[commandName];
    return !command || isOwnedSlashCommand(command);
}

function removeOwnedSlashCommand(commandName) {
    const command = SlashCommandParser.commands?.[commandName];
    if (isOwnedSlashCommand(command)) {
        delete SlashCommandParser.commands[commandName];
    }
}

function registerTamakoSlashCommands() {
    if (slashCommandsRegistered) {
        return;
    }

    for (const commandDefinition of TAMAKO_SLASH_COMMANDS) {
        const commandNames = [commandDefinition.name, ...(commandDefinition.aliases || [])];
        const hasForeignCommand = commandNames.some(commandName => !canReplaceSlashCommand(commandName));

        if (hasForeignCommand) {
            console.warn(`[玉子市场] Slash Command /${commandDefinition.name} 或其别名已被其他扩展占用，已跳过注册`);
            continue;
        }

        commandNames.forEach(removeOwnedSlashCommand);
        SlashCommandParser.addCommandObject(SlashCommand.fromProps(commandDefinition));
    }

    slashCommandsRegistered = true;
}

function unregisterTamakoSlashCommands() {
    TAMAKO_SLASH_COMMAND_NAMES.forEach(removeOwnedSlashCommand);
    slashCommandsRegistered = false;
}

function syncEnabledSetting(enabled) {
    setExtensionEnabled(enabled);
    const updatedSettings = saveSetting('enabled', enabled);
    $('#tamako-enabled').prop('checked', enabled);
    applyToggleButtonVisibility(updatedSettings);
    return updatedSettings;
}

function openWindowFromSlashCommand() {
    const settings = getSettings();
    const effectiveSettings = settings.enabled === false ? syncEnabledSetting(true) : settings;

    createWindow();
    createToggleButton();
    applyToggleButtonVisibility(effectiveSettings);
    toggleWindow(true);

    return '';
}

function closeWindowFromSlashCommand() {
    toggleWindow(false);
    return '';
}

function toggleWindowFromSlashCommand() {
    const isVisible = $('#tamako-market-window').hasClass('visible');
    if (isVisible) {
        return closeWindowFromSlashCommand();
    }

    return openWindowFromSlashCommand();
}

function scheduleSettingsPanelCreation() {
    if (settingsPanelTimer) {
        clearTimeout(settingsPanelTimer);
    }

    settingsPanelTimer = setTimeout(() => {
        settingsPanelTimer = null;
        createSettingsPanel();
    }, 2000);
}

function createRuntimeCallbacks() {
    return {
        onUpdate: updateCurrentContent,
        onHistoryUpdate: updateHistoryList,
        onNewItem: () => {
            showDeraToast('newItem');

            const $toggle = $('#tamako-market-toggle');
            if (!$toggle.length || !$toggle.is(':visible') || $('#tamako-market-window').hasClass('visible')) {
                return;
            }

            $toggle.addClass('has-new');
            setTimeout(() => $toggle.removeClass('has-new'), 3000);
        },
    };
}

registerTamakoSlashCommands();

// ===== 初始化 =====

(function init() {
    const onReady = () => {
        try {
            const settings = getSettings();
            setExtensionEnabled(settings.enabled !== false);

            createWindow();
            createToggleButton();
            applyToggleButtonVisibility(settings);
            scheduleSettingsPanelCreation();

            if (!runtimeController) {
                runtimeController = createRuntimeController(createRuntimeCallbacks());
            }
            runtimeController.start();
            
            console.log('[玉子市场] v2.9.2 - 版本说明提醒版');
        } catch (e) {
            console.error('[玉子市场] 初始化错误:', e);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        setTimeout(onReady, 100);
    }
})();

// ===== 扩展销毁函数 =====
/**
 * 清理所有资源，防止内存泄漏
 * 可在扩展卸载或页面切换时调用
 */
export function destroy() {
    try {
        console.log('[玉子市场] 开始清理资源...');
        
        if (settingsPanelTimer) {
            clearTimeout(settingsPanelTimer);
            settingsPanelTimer = null;
        }

        unregisterTamakoSlashCommands();

        if (runtimeController) {
            runtimeController.destroy();
            runtimeController = null;
        } else {
            cleanupAllResources();
        }
        
        // 移除 DOM 元素
        const $window = $('#tamako-market-window');
        
        // 释放 iframe 的 blob URL
        const iframe = $window.find('.tamako-beautifier-frame')[0];
        if (iframe && iframe._blobUrl) {
            URL.revokeObjectURL(iframe._blobUrl);
            iframe._blobUrl = null;
        }
        
        $window.remove();
        removeToggleButton();
        $('#tamako-market-settings').remove();
        
        console.log('[玉子市场] 扩展已卸载');
    } catch (e) {
        console.error('[玉子市场] 卸载错误:', e);
    }
}
