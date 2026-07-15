// modules/runtime.js
/**
 * 玉子市场 - 运行时生命周期
 * @version 2.8.6
 *
 * 负责：事件装配、DOM 观察、扫描调度、运行时资源清理
 */

import {
    setCapturedPlots,
    getCapturedPlots,
    setMutationObserver,
    initEventListenerManager,
    cleanupAllResources,
} from './state.js';
import { EventTypes, getSTContext, getEventSource, resolveMessageEventIndex } from './events.js';
import {
    reconcileUserMessage,
    scanAllMessages,
} from './capture.js';

const CHAT_CHANGE_DEBOUNCE_MS = 250;
const CHAT_CHANGE_SCAN_DELAY_MS = 800;
const ADD_DEBOUNCE_MS = 500;
const REMOVE_DEBOUNCE_MS = 300;
const MESSAGE_SENT_DELAY_MS = 300;
const USER_MESSAGE_RENDERED_DELAY_MS = 200;
const GENERATION_CHECK_DELAY_MS = 300;
const OBSERVER_RETRY_DELAY_MS = 1000;
const INITIAL_SCAN_DELAY_MS = 2000;
const LATE_WRITE_RETRY_DELAYS_MS = [250, 500, 1000];

function clearTimer(timerId) {
    if (timerId) {
        clearTimeout(timerId);
    }
    return null;
}

/**
 * @typedef {Object} RuntimeCallbacks
 * @property {(content: string, rawMessage: string) => void} [onUpdate]
 * @property {() => void} [onHistoryUpdate]
 * @property {() => void} [onNewItem]
 */

/**
 * 创建运行时控制器
 * @param {RuntimeCallbacks} [uiCallbacks={}]
 */
export function createRuntimeController(uiCallbacks = {}) {
    let initialScanDone = false;
    let chatChangeScanTimer = null;
    let addDebounceTimer = null;
    let removeDebounceTimer = null;
    let observerRetryTimer = null;
    let initialScanTimer = null;
    let rangeScanTask = null;
    let activeMutationObserver = null;
    let started = false;
    let disposed = false;
    let chatGeneration = 0;
    const scheduledTimers = new Set();
    const reconcileTasks = new Map();
    const lateWriteTasks = new Map();

    function getCallbacks() {
        return {
            onUpdate: uiCallbacks.onUpdate,
            onHistoryUpdate: uiCallbacks.onHistoryUpdate,
            onNewItem: uiCallbacks.onNewItem,
        };
    }

    function isActive() {
        return started && !disposed;
    }

    function schedule(delay, callback) {
        if (!isActive()) return null;
        const generation = chatGeneration;
        const timer = setTimeout(() => {
            scheduledTimers.delete(timer);
            if (!isActive() || generation !== chatGeneration) return;
            callback();
        }, delay);
        scheduledTimers.add(timer);
        return timer;
    }

    function cancelScheduledTimer(timer) {
        if (timer === null || timer === undefined) return;
        clearTimeout(timer);
        scheduledTimers.delete(timer);
    }

    function clearReconcileTasks() {
        for (const task of reconcileTasks.values()) cancelScheduledTimer(task.timer);
        reconcileTasks.clear();
    }

    function clearLateWriteTasks() {
        for (const task of lateWriteTasks.values()) clearTimeout(task.timer);
        lateWriteTasks.clear();
    }

    function invalidateIndexedWork() {
        clearReconcileTasks();
        clearLateWriteTasks();
    }

    function scheduleRangeScan(delay = 0, invalidateIndexes = false) {
        if (invalidateIndexes) invalidateIndexedWork();
        if (!isActive()) return null;

        const dueAt = Date.now() + Math.max(0, Number(delay) || 0);
        if (rangeScanTask && rangeScanTask.generation === chatGeneration) {
            if (rangeScanTask.dueAt <= dueAt) return rangeScanTask.timer;
            cancelScheduledTimer(rangeScanTask.timer);
        }

        const generation = chatGeneration;
        const timer = schedule(delay, () => {
            if (rangeScanTask?.timer === timer) rangeScanTask = null;
            doScanAndUpdate();
        });
        if (timer !== null) rangeScanTask = { timer, generation, dueAt };
        return timer;
    }

    function clearScheduledWork() {
        for (const timer of scheduledTimers) clearTimeout(timer);
        scheduledTimers.clear();
        reconcileTasks.clear();
        rangeScanTask = null;
        clearLateWriteTasks();
    }

    function hasAuthoritativeQrf(message) {
        return typeof message?.qrf_plot === 'string' && message.qrf_plot.trim().length > 0;
    }

    function scheduleLateWriteRetry(messageIndex, attempt = 0) {
        if (!isActive()
            || !Number.isSafeInteger(messageIndex)
            || lateWriteTasks.has(messageIndex)) {
            return;
        }
        const generation = chatGeneration;
        const sourceMessage = getSTContext()?.chat?.[messageIndex];
        if (!sourceMessage) return;

        const runAttempt = (nextAttempt) => {
            const delay = LATE_WRITE_RETRY_DELAYS_MS[nextAttempt];
            if (delay === undefined) {
                lateWriteTasks.delete(messageIndex);
                return;
            }

            const timer = setTimeout(() => {
                if (!isActive() || generation !== chatGeneration) {
                    lateWriteTasks.delete(messageIndex);
                    return;
                }
                const chat = getSTContext()?.chat;
                if (!Array.isArray(chat) || messageIndex >= chat.length) {
                    lateWriteTasks.delete(messageIndex);
                    return;
                }
                if (chat[messageIndex] !== sourceMessage) {
                    lateWriteTasks.delete(messageIndex);
                    scheduleRangeScan(0, true);
                    return;
                }

                reconcileUserMessage(messageIndex, getCallbacks());
                if (hasAuthoritativeQrf(chat[messageIndex])) {
                    lateWriteTasks.delete(messageIndex);
                    return;
                }
                runAttempt(nextAttempt + 1);
            }, delay);
            lateWriteTasks.set(messageIndex, { timer, generation, attempt: nextAttempt });
        };

        runAttempt(attempt);
    }

    function reconcileFromEvent(args, delay = 0, retryLateWrite = false) {
        if (!isActive()) return;
        const chat = getSTContext()?.chat;
        const messageIndex = resolveMessageEventIndex(args, chat);
        if (messageIndex === null) {
            scheduleRangeScan(delay, true);
            return;
        }

        const existingTask = reconcileTasks.get(messageIndex);
        const shouldRetryLateWrite = retryLateWrite || existingTask?.retryLateWrite === true;
        const dueAt = Date.now() + Math.max(0, Number(delay) || 0);
        if (existingTask && existingTask.generation === chatGeneration && existingTask.dueAt <= dueAt) {
            existingTask.retryLateWrite = shouldRetryLateWrite;
            return;
        }
        if (existingTask) cancelScheduledTimer(existingTask.timer);

        const generation = chatGeneration;
        const sourceMessage = chat?.[messageIndex];
        const task = {
            timer: null,
            generation,
            dueAt,
            retryLateWrite: shouldRetryLateWrite,
            sourceMessage,
        };
        const timer = schedule(delay, () => {
            if (reconcileTasks.get(messageIndex) === task) reconcileTasks.delete(messageIndex);
            const currentChat = getSTContext()?.chat;
            if (!Array.isArray(currentChat) || currentChat[messageIndex] !== sourceMessage) {
                scheduleRangeScan(0, true);
                return;
            }
            reconcileUserMessage(messageIndex, getCallbacks());
            if (task.retryLateWrite && !hasAuthoritativeQrf(currentChat[messageIndex])) {
                scheduleLateWriteRetry(messageIndex);
            }
        });
        if (timer !== null) {
            task.timer = timer;
            reconcileTasks.set(messageIndex, task);
        }
    }

    function invalidateChatGeneration() {
        chatGeneration++;
        clearScheduledWork();
    }

    function scheduleObserverRetry() {
        observerRetryTimer = clearTimer(observerRetryTimer);
        if (!isActive() || activeMutationObserver) {
            return;
        }

        observerRetryTimer = setTimeout(() => {
            observerRetryTimer = null;
            setupMutationObserver();
        }, OBSERVER_RETRY_DELAY_MS);
    }

    function setupMutationObserver() {
        if (!isActive() || activeMutationObserver) {
            return;
        }

        let observer = null;
        try {
            const chatContainer = document.getElementById('chat');
            if (!chatContainer) {
                scheduleObserverRetry();
                return;
            }

            observer = new MutationObserver((mutations) => {
                if (!isActive()) return;
                let hasAdded = false;
                let hasRemoved = false;

                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (
                                node.nodeType === 1 &&
                                (node.classList?.contains('mes') || node.querySelector?.('.mes'))
                            ) {
                                hasAdded = true;
                                break;
                            }
                        }
                    }

                    if (mutation.removedNodes.length > 0) {
                        for (const node of mutation.removedNodes) {
                            if (
                                node.nodeType === 1 &&
                                (node.classList?.contains('mes') || node.querySelector?.('.mes'))
                            ) {
                                hasRemoved = true;
                                break;
                            }
                        }
                    }

                    if (hasAdded && hasRemoved) {
                        break;
                    }
                }

                if (hasAdded || hasRemoved) {
                    invalidateIndexedWork();
                }

                if (hasAdded) {
                    cancelScheduledTimer(addDebounceTimer);
                    addDebounceTimer = null;
                    addDebounceTimer = schedule(ADD_DEBOUNCE_MS, () => {
                        addDebounceTimer = null;
                        scheduleRangeScan(0);
                    });
                }

                if (hasRemoved) {
                    cancelScheduledTimer(removeDebounceTimer);
                    removeDebounceTimer = null;
                    removeDebounceTimer = schedule(REMOVE_DEBOUNCE_MS, () => {
                        removeDebounceTimer = null;
                        scheduleRangeScan(0);
                    });
                }
            });

            observer.observe(chatContainer, { childList: true, subtree: true });
            activeMutationObserver = observer;
            setMutationObserver(observer);

            console.log('[玉子市场] MutationObserver 已设置');
        } catch (error) {
            observer?.disconnect?.();
            console.error('[玉子市场] DOM监听失败:', error);
            scheduleObserverRetry();
        }
    }

    function doScanAndUpdate() {
        if (!isActive()) return false;
        const callbacks = getCallbacks();
        scanAllMessages(callbacks);
        initialScanDone = true;
        return true;
    }

    function scheduleInitialScan() {
        cancelScheduledTimer(initialScanTimer);
        initialScanTimer = null;
        initialScanTimer = schedule(INITIAL_SCAN_DELAY_MS, () => {
            initialScanTimer = null;
            if (disposed || initialScanDone) {
                return;
            }

            const context = getSTContext();
            if (Array.isArray(context?.chat)) doScanAndUpdate();
        });
    }

    function registerEventListeners() {
        const manager = initEventListenerManager();
        const context = getSTContext();
        const eventSource = getEventSource();
        const callbacks = getCallbacks();

        if (!context || !eventSource) {
            console.warn('[玉子市场] 无法获取 SillyTavern 上下文，仅使用 DOM 监听');
            setupMutationObserver();
            scheduleInitialScan();
            return;
        }

        console.log('[玉子市场] 初始化事件监听器...');

        let lastChatChangeAt = 0;
        const onChatChanged = () => {
            if (!isActive()) return;
            const now = Date.now();
            const shouldNotifyReset = now - lastChatChangeAt >= CHAT_CHANGE_DEBOUNCE_MS;
            lastChatChangeAt = now;

            // 每次切换信号都必须建立新的代次屏障；短窗只合并重复 UI 清空。
            invalidateChatGeneration();
            if (shouldNotifyReset) {
                setCapturedPlots([]);
                getCallbacks().onUpdate?.('', '');
                getCallbacks().onHistoryUpdate?.();
            }
            cancelScheduledTimer(chatChangeScanTimer);
            chatChangeScanTimer = null;
            chatChangeScanTimer = schedule(CHAT_CHANGE_SCAN_DELAY_MS, () => {
                chatChangeScanTimer = null;
                doScanAndUpdate();
            });
        };

        manager.register(eventSource, EventTypes.CHAT_CHANGED, onChatChanged, {
            useAlias: true,
            debounce: 0,
        });

        manager.register(eventSource, EventTypes.MESSAGE_SENT, (...args) => {
            if (!isActive()) return;
            reconcileFromEvent(args, MESSAGE_SENT_DELAY_MS, true);
        }, { useAlias: true });

        manager.register(eventSource, EventTypes.USER_MESSAGE_RENDERED, (...args) => {
            if (!isActive()) return;
            reconcileFromEvent(args, USER_MESSAGE_RENDERED_DELAY_MS, true);
        }, { useAlias: true });

        manager.register(eventSource, EventTypes.GENERATION_STARTED, () => {
            if (!isActive()) return;
            scheduleRangeScan(GENERATION_CHECK_DELAY_MS);
        }, { useAlias: true });

        manager.register(eventSource, EventTypes.GENERATION_ENDED, () => {
            if (!isActive()) return;
            scheduleRangeScan(GENERATION_CHECK_DELAY_MS);
        }, { useAlias: true });

        manager.register(eventSource, EventTypes.MESSAGE_UPDATED, (...args) => {
            if (!isActive()) return;
            reconcileFromEvent(args, 0, true);
        }, { useAlias: true });
        manager.register(eventSource, EventTypes.MESSAGE_SWIPED, (...args) => {
            if (!isActive()) return;
            reconcileFromEvent(args, 0, false);
        }, { useAlias: true });
        manager.register(eventSource, EventTypes.MESSAGE_DELETED, () => {
            if (!isActive()) return;
            scheduleRangeScan(0, true);
        }, { useAlias: true });

        console.log(`[玉子市场] 已注册 ${manager.count} 个事件监听器`);

        setupMutationObserver();
        scheduleInitialScan();
    }

    function start() {
        if (started) {
            return;
        }

        started = true;
        disposed = false;
        chatGeneration++;
        registerEventListeners();
    }

    function destroy() {
        disposed = true;
        started = false;
        initialScanDone = false;
        activeMutationObserver = null;
        invalidateChatGeneration();

        cancelScheduledTimer(chatChangeScanTimer);
        cancelScheduledTimer(addDebounceTimer);
        cancelScheduledTimer(removeDebounceTimer);
        cancelScheduledTimer(initialScanTimer);
        chatChangeScanTimer = null;
        addDebounceTimer = null;
        removeDebounceTimer = null;
        observerRetryTimer = clearTimer(observerRetryTimer);
        initialScanTimer = null;

        cleanupAllResources();
    }

    return {
        start,
        destroy,
        forceScan: doScanAndUpdate,
    };
}
