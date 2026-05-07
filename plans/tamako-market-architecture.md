# 玉子市场扩展架构审查与维护接手文档

> 文档主轴：维护接手。目标是让后续干活的 AI 在改动前能快速理解扩展职责、模块边界、调用链、数据流、风险边界和正确修改入口。助手，别把这份文档当装饰品；它的价值在于把已确认事实和风险写清楚，而不是把模块名排成好看的表格。

## 1. 审查边界

### 1.1 已确认事实

- 扩展通过 [`manifest.json`](manifest.json:1) 声明加载入口 [`index.js`](index.js:1) 和样式 [`style.css`](style.css:1)。
- 当前扩展版本在 [`manifest.json`](manifest.json:9)、[`index.js`](index.js:4)、[`extensionVersion`](modules/constants.js:8) 中均为 2.9.2。
- 运行时入口由 [`index.js`](index.js:166) 在页面就绪后初始化窗口、按钮、设置面板和运行时控制器。
- 剧情捕获数据保存在内存态 [`capturedPlots`](modules/state.js:50)，不是单独持久化库存。
- 用户设置通过 SillyTavern 扩展设置容器读取和写入，核心入口是 [`ensureSettings()`](modules/settings.js:223)、[`getSettings()`](modules/settings.js:238)、[`saveSetting()`](modules/settings.js:270)。
- 自动捕获同时依赖 SillyTavern 事件源和 DOM 观察，主控在 [`createRuntimeController()`](modules/runtime.js:52)。
- 当前测试主要覆盖纯逻辑模块，不覆盖真实 DOM、真实 SillyTavern 事件源、窗口拖拽、美化器 iframe 和主题编辑器交互。

### 1.2 未确认事项

- 没有在真实 SillyTavern 页面里执行交互验证；本文档基于静态代码审查。
- 没有执行测试脚本；测试覆盖范围来自读取 [`tests/capture-core.test.js`](tests/capture-core.test.js:1)、[`tests/beautifier-cache.test.js`](tests/beautifier-cache.test.js:1)、[`tests/settings-template-core.test.js`](tests/settings-template-core.test.js:1)、[`tests/toggle-visibility-core.test.js`](tests/toggle-visibility-core.test.js:1)、[`tests/version-info-core.test.js`](tests/version-info-core.test.js:1)。
- 没有逐行审查 [`style.css`](style.css:1) 的所有样式规则；本文只把它作为动态 DOM 的样式承载层记录。

## 2. 一眼看懂扩展

玉子市场是一个 SillyTavern 第三方扩展：

- 用悬浮按钮和悬浮窗展示被捕获的剧情推进片段。
- 从用户消息中提取指定 XML 风格标签，例如默认设置里的 recall 和 scene_direction，默认值来自 [`defaultSettings`](modules/constants.js:155)。
- 将捕获结果展示在今日特选和库存两个页签中，窗口结构由 [`createWindow()`](modules/window.js:33) 动态插入。
- 支持模板美化器，模板解析入口是 [`parseBeautifierTemplate()`](modules/beautifier.js:22)，渲染入口是 [`renderWithBeautifier()`](modules/beautifier.js:294)。
- 支持自定义主题和悬浮按钮样式，主题落地入口是 [`applyTheme()`](modules/theme-application.js:6)。
- 支持 Quick Reply 调用的 Slash Command，注册逻辑在 [`registerTamakoSlashCommands()`](index.js:73)。

简化层级如下：

1. 扩展装载层：[`manifest.json`](manifest.json:1) → [`index.js`](index.js:1)。
2. 生命周期层：[`createRuntimeController()`](modules/runtime.js:52)、[`destroy()`](index.js:200)。
3. 状态与设置层：[`state.js`](modules/state.js:1)、[`settings.js`](modules/settings.js:1)、[`constants.js`](modules/constants.js:1)。
4. 捕获层：[`capture-core.js`](modules/capture-core.js:1)、[`capture.js`](modules/capture.js:1)。
5. 展示层：[`window.js`](modules/window.js:1)、[`window-content.js`](modules/window-content.js:1)、[`window-history.js`](modules/window-history.js:1)、[`toggle.js`](modules/toggle.js:1)。
6. 美化与主题层：[`beautifier.js`](modules/beautifier.js:1)、[`settings-templates.js`](modules/settings-templates.js:1)、[`theme-editor.js`](modules/theme-editor.js:1)、[`theme-application.js`](modules/theme-application.js:1)。

## 3. 入口与生命周期

### 3.1 加载入口

| 阶段 | 已确认入口 | 说明 |
|---|---|---|
| 扩展清单 | [`manifest.json`](manifest.json:1) | 声明显示名、版本、入口脚本和样式。 |
| 主脚本 | [`index.js`](index.js:1) | 编排 Slash Command、窗口、按钮、设置面板和运行时。 |
| 样式 | [`style.css`](style.css:1) | 承载所有动态插入 DOM 的视觉样式。 |
| 配套 QR | [`玉子市场qr.json`](玉子市场qr.json:1) | 提供 Quick Reply 调用入口，默认消息指向 tamako toggle 行为。 |

### 3.2 初始化链路

[`index.js`](index.js:166) 的初始化流程如下：

1. 页面就绪后读取 [`getSettings()`](modules/settings.js:238)。
2. 用 [`setExtensionEnabled()`](modules/state.js:156) 同步运行态启用状态。
3. 调用 [`createWindow()`](modules/window.js:33) 创建悬浮窗 DOM。
4. 调用 [`createToggleButton()`](modules/toggle.js:25) 创建悬浮按钮。
5. 调用 [`applyToggleButtonVisibility()`](modules/toggle.js:57) 按设置决定按钮可见性。
6. 通过 [`scheduleSettingsPanelCreation()`](index.js:133) 延迟创建设置面板，实际渲染入口是 [`createSettingsPanel()`](modules/settings-panel.js:17)。
7. 创建并启动 [`createRuntimeController()`](modules/runtime.js:52)。

### 3.3 Slash Command 链路

| 命令行为 | 回调入口 | 关键副作用 |
|---|---|---|
| 打开窗口 | [`openWindowFromSlashCommand()`](index.js:107) | 如果扩展被禁用，会通过 [`syncEnabledSetting()`](index.js:99) 重新启用；创建窗口和按钮；显示窗口。 |
| 关闭窗口 | [`closeWindowFromSlashCommand()`](index.js:119) | 调用 [`toggleWindow()`](modules/window.js:394) 关闭窗口。 |
| 切换窗口 | [`toggleWindowFromSlashCommand()`](index.js:124) | 根据 [`#tamako-market-window`](modules/window.js:45) 当前可见类切换开关。 |
| 注册命令 | [`registerTamakoSlashCommands()`](index.js:73) | 若命令名或别名被其他扩展占用，会跳过注册并告警。 |
| 注销命令 | [`unregisterTamakoSlashCommands()`](index.js:94) | 销毁时移除本扩展拥有的命令。 |

### 3.4 销毁链路

[`destroy()`](index.js:200) 是统一卸载入口：

- 清理设置面板延迟计时器。
- 注销 Slash Command。
- 销毁 [`runtimeController`](index.js:50)，最终进入 [`cleanupAllResources()`](modules/state.js:287)。
- 释放美化器 iframe 的 Blob URL，见 [`destroy()`](index.js:221)。
- 移除窗口、按钮和设置面板 DOM。

注意：大量 jQuery 事件绑定依附于被移除 DOM，自身没有全部进入 [`EventListenerManager`](modules/events.js:56)。这不是马上坏，但后续若允许重复创建局部 DOM，就不能只靠 DOM 移除自我安慰。

## 4. 运行时事件架构

### 4.1 事件源与 DOM 观察

[`createRuntimeController()`](modules/runtime.js:52) 同时使用两类触发源：

| 触发源 | 入口 | 用途 |
|---|---|---|
| SillyTavern 事件源 | [`registerEventListeners()`](modules/runtime.js:184) | 监听聊天切换、消息发送、用户消息渲染、生成开始、生成结束、消息删除、消息更新、消息滑动。 |
| DOM 观察 | [`setupMutationObserver()`](modules/runtime.js:82) | 监听聊天 DOM 中消息节点新增和删除，作为事件源之外的补充触发。 |
| 初始扫描 | [`scheduleInitialScan()`](modules/runtime.js:169) | 页面加载后延迟扫描已有聊天。 |

事件常量定义在 [`EventTypes`](modules/events.js:13)，兼容别名定义在 [`EventAliases`](modules/events.js:41)。注册和清理统一由 [`EventListenerManager`](modules/events.js:56) 管理。

### 4.2 运行时触发流

| 场景 | 运行时处理 | 捕获层入口 | UI 回调 |
|---|---|---|---|
| 聊天切换 | [`onChatChanged`](modules/runtime.js:200) 清空 [`capturedPlots`](modules/state.js:50)，延迟扫描 | [`scanAllMessages()`](modules/capture.js:160) | [`updateCurrentContent()`](modules/window.js:422)、[`updateHistoryList()`](modules/window.js:426) |
| 用户消息发送 | [`EventTypes.MESSAGE_SENT`](modules/events.js:15) 延迟处理 | [`handleUserMessage()`](modules/capture.js:70) | 更新当前内容、库存列表、新货提示 |
| 用户消息渲染 | [`EventTypes.USER_MESSAGE_RENDERED`](modules/events.js:17) 延迟处理 | [`handleUserMessage()`](modules/capture.js:70) | 同上 |
| 生成开始或结束 | [`EventTypes.GENERATION_STARTED`](modules/events.js:24)、[`EventTypes.GENERATION_ENDED`](modules/events.js:26) | [`checkLatestUserMessage()`](modules/capture.js:132) | 只检查最新用户消息 |
| 消息删除或更新 | [`validateEvents`](modules/runtime.js:236) | [`validateCapturedPlots()`](modules/capture.js:246) | 重提取并同步 UI |
| DOM 新增消息节点 | [`MutationObserver`](modules/runtime.js:95) 识别新增 | [`checkLatestUserMessage()`](modules/capture.js:132) | 同上 |
| DOM 移除消息节点 | [`MutationObserver`](modules/runtime.js:95) 识别删除 | [`validateCapturedPlots()`](modules/capture.js:246) | 同上 |

### 4.3 防抖与清理

- 聊天切换去重窗口由 [`CHAT_CHANGE_DEBOUNCE_MS`](modules/runtime.js:24) 控制。
- DOM 新增和删除分别使用 [`ADD_DEBOUNCE_MS`](modules/runtime.js:26)、[`REMOVE_DEBOUNCE_MS`](modules/runtime.js:27)。
- 捕获校验还有一层 [`validateDebounceTimer`](modules/state.js:90)，由 [`validateCapturedPlots()`](modules/capture.js:246) 使用。
- 销毁时 [`destroy()`](modules/runtime.js:264) 会清理运行时计时器，并调用 [`cleanupAllResources()`](modules/state.js:287)。

## 5. 剧情捕获链路

### 5.1 捕获门槛

核心纯逻辑在 [`extractPlotContent()`](modules/capture-core.js:84)：

1. 消息为空时拒绝。
2. 扩展禁用时拒绝。
3. 自动捕获关闭时拒绝。
4. 捕获标签列表为空时拒绝。
5. 消息必须命中关键词门槛，关键词定义在 [`KEYWORD_PATTERNS`](modules/capture-core.js:16)。
6. 按 [`captureTags`](modules/constants.js:162) 提取标签内容。

这意味着：不是所有带 recall 或 scene_direction 的消息都会捕获，必须同时有用户输入提示关键词。后续 AI 如果只看标签规则就改捕获行为，漏洞明显得像是故意写给事故看的。

### 5.2 标签提取

- 标签正则缓存由 [`tagRegexCache`](modules/capture-core.js:9) 保存。
- 正则生成入口是 [`getTagRegex()`](modules/capture-core.js:30)。
- 实际提取入口是 [`extractTagContent()`](modules/capture-core.js:59)。
- 提取结果保留完整标签文本，而不是只取标签内部文本，见 [`matches.push(match[0])`](modules/capture-core.js:67)。

风险：用户输入的标签名没有进行正则转义，正则构建在 [`getTagRegex()`](modules/capture-core.js:34)。如果设置面板允许异常标签进入 [`captureTags`](modules/settings-panel.js:291)，可能导致正则异常或非预期匹配。

### 5.3 捕获状态模型

捕获记录形状定义在 [`CapturedPlot`](modules/state.js:11)：

| 字段 | 来源 | 说明 |
|---|---|---|
| content | [`extractPlotContent()`](modules/capture-core.js:84) | 拼接后的标签内容。 |
| rawMessage | [`extractPlotContent()`](modules/capture-core.js:84) | 原始用户消息，用于美化器模板。 |
| timestamp | [`handleUserMessage()`](modules/capture.js:94) 或 [`scanAllMessages()`](modules/capture.js:195) | 捕获时间或扫描估算时间。 |
| messageIndex | [`handleUserMessage()`](modules/capture.js:70) | SillyTavern 聊天数组中的消息索引。 |

重要边界：[`capturedPlots`](modules/state.js:50) 是内存状态。刷新页面、切换聊天、销毁扩展后，不应假设库存仍存在。

### 5.4 捕获入口差异

| 入口 | 行为 | 适用场景 |
|---|---|---|
| [`handleUserMessage()`](modules/capture.js:70) | 处理指定消息索引，跳过非用户消息和已捕获索引。 | 事件源给出明确消息索引时。 |
| [`checkLatestUserMessage()`](modules/capture.js:132) | 从后向前找最新用户消息，只处理一条。 | DOM 新增、生成开始、生成结束等不稳定触发。 |
| [`scanAllMessages()`](modules/capture.js:160) | 从后向前扫描，受最大扫描数限制。 | 初始扫描、手动扫描、聊天切换。 |
| [`validateCapturedPlots()`](modules/capture.js:246) | 防抖后重提取已有记录，剔除已删或不再匹配项。 | 消息删除、消息更新、消息滑动。 |

## 6. 悬浮窗展示链路

### 6.1 窗口结构

[`createWindow()`](modules/window.js:33) 动态插入 [`#tamako-market-window`](modules/window.js:45)，包含：

- 标题栏和控制按钮，见 [`tamako-controls`](modules/window.js:53)。
- 主题选择面板，见 [`tamako-theme-panel`](modules/window.js:62)。
- 今日特选和库存页签，见 [`tamako-tabs`](modules/window.js:65)。
- 当前内容区，见 [`data-content="current"`](modules/window.js:70)。
- 历史库存区，见 [`data-content="history"`](modules/window.js:76)。
- 删除模式工具条，见 [`tamako-delete-bar`](modules/window.js:84)。
- 三个缩放手柄，见 [`tamako-resize`](modules/window.js:94)。

窗口位置和尺寸来自设置，写入点包括 [`saveSetting('windowX')`](modules/window.js:188)、[`saveSetting('windowY')`](modules/window.js:189)、[`saveSetting('windowWidth')`](modules/window.js:277)、[`saveSetting('windowHeight')`](modules/window.js:278)。

### 6.2 拖拽与缩放

- 窗口拖拽入口是 [`initDraggable()`](modules/window.js:129)，状态存在 [`dragState`](modules/state.js:115)。
- 窗口缩放入口是 [`initResizable()`](modules/window.js:206)，状态存在 [`resizeState`](modules/state.js:104)。
- 拖拽和缩放时会隐藏美化器 iframe，避免 iframe 抢事件，入口是 [`hideBeautifierFrame()`](modules/utils.js:371) 与 [`showBeautifierFrame()`](modules/utils.js:376)。
- 位置约束统一使用 [`constrainPosition()`](modules/utils.js:127)。

### 6.3 当前内容渲染

当前内容更新从 [`updateCurrentContent()`](modules/window-content.js:50) 开始：

1. 无内容时渲染空态，入口是 [`renderEmptyState()`](modules/window-content.js:23)。
2. 美化器启用且有活动模板时，走 [`renderWithBeautifier()`](modules/beautifier.js:294)。
3. 否则走 [`renderPlainText()`](modules/window-content.js:33)。

风险：[`renderPlainText()`](modules/window-content.js:33) 里的 HTML 转义是无效实现，相关替换在 [`window-content.js`](modules/window-content.js:38) 到 [`window-content.js`](modules/window-content.js:41)。这会让原始捕获内容以 HTML 方式进入 [`$content.html()`](modules/window-content.js:47)。这是明确的 XSS 风险，不能写成安全纯文本回退。

### 6.4 库存列表与删除模式

- 库存计数入口是 [`updateCaptureCount()`](modules/window-history.js:21)。
- 删除模式入口是 [`toggleDeleteMode()`](modules/window-history.js:27)。
- 批量删除入口是 [`deleteSelectedItems()`](modules/window-history.js:45)。
- 历史列表渲染入口是 [`updateHistoryList()`](modules/window-history.js:76)。
- 搜索过滤复用 [`filterPlots()`](modules/capture-core.js:137)。

删除只是删除内存态 [`capturedPlots`](modules/state.js:50) 中的记录，不会修改 SillyTavern 原始聊天消息。

### 6.5 悬浮按钮

- 创建入口是 [`createToggleButton()`](modules/toggle.js:25)。
- 可见性规则抽成纯函数 [`shouldShowToggleButton()`](modules/toggle-visibility-core.js:15)。
- 拖拽入口是 [`initToggleDraggable()`](modules/toggle.js:107)。
- 点击切换窗口调用 [`toggleWindow()`](modules/window.js:394)。
- 按钮位置保存到 [`toggleX`](modules/constants.js:166) 和 [`toggleY`](modules/constants.js:167)。

如果用户勾选隐藏悬浮按钮，窗口仍可通过 Slash Command 打开；这由 [`openWindowFromSlashCommand()`](index.js:107) 显式创建窗口和按钮后再应用可见性决定。

## 7. 设置与持久化链路

### 7.1 默认设置

默认设置定义在 [`defaultSettings`](modules/constants.js:155)：

| 配置域 | 关键字段 | 说明 |
|---|---|---|
| 启用状态 | [`enabled`](modules/constants.js:156)、[`autoCapture`](modules/constants.js:161) | 控制扩展和自动捕获。 |
| 窗口布局 | [`windowX`](modules/constants.js:157)、[`windowY`](modules/constants.js:158)、[`windowWidth`](modules/constants.js:159)、[`windowHeight`](modules/constants.js:160) | 控制悬浮窗位置和尺寸。 |
| 捕获规则 | [`captureTags`](modules/constants.js:162)、[`maxScanMessages`](modules/constants.js:164)、[`maxStoredPlots`](modules/constants.js:165) | 控制扫描、存储和提取标签。 |
| 按钮 | [`toggleX`](modules/constants.js:166)、[`toggleY`](modules/constants.js:167)、[`hideToggleButton`](modules/constants.js:168) | 控制悬浮按钮位置和显示。 |
| 版本提示 | [`remoteVersion`](modules/constants.js:169)、[`remoteVersionCheckedAt`](modules/constants.js:170) | 控制远端版本缓存。 |
| 美化器 | [`beautifier`](modules/constants.js:171) | 保存模板列表和活动模板。 |
| 主题 | [`customTheme`](modules/constants.js:176) | 保存自定义主题。 |

### 7.2 规范化与迁移

- 设置入口会调用 [`normalizeSettingsShape()`](modules/settings.js:164)，保证旧配置或异常配置回落到合理结构。
- 模板旧格式迁移在 [`normalizeBeautifierSettings()`](modules/settings.js:123)，会把旧版单模板迁移到模板数组。
- 自定义主题规范化在 [`normalizeCustomTheme()`](modules/settings.js:65)。
- 数值边界由 [`normalizeBoundedInteger()`](modules/settings.js:34) 和 [`normalizePositiveNumber()`](modules/settings.js:42) 处理。

后续新增设置项时，不能只改 UI。必须同时改 [`defaultSettings`](modules/constants.js:155)、[`normalizeSettingsShape()`](modules/settings.js:164)、设置面板绑定，以及必要测试。少一步就会出现设置保存后丢失或旧用户配置异常。

### 7.3 设置面板

设置面板由 [`createSettingsPanel()`](modules/settings-panel.js:17) 插入到 [`extensions_settings`](modules/settings-panel.js:19)。它负责：

- 基础开关绑定，入口是 [`bindBasicSettingsEvents()`](modules/settings-panel.js:273)。
- 打开窗口、重置窗口、重置按钮，入口是 [`bindButtonEvents()`](modules/settings-panel.js:318)。
- 美化器模板管理事件，通过 [`bindBeautifierEvents()`](modules/settings-templates.js:15) 绑定。
- 版本说明和 NEW 标记，依赖 [`createVersionNoticeState()`](modules/version-info-core.js:39) 与 [`getVersionHistorySince()`](modules/version-info-core.js:53)。

远端版本检查由 [`refreshRemoteVersionState()`](modules/settings-panel.js:157) 发起，请求地址是 [`remoteManifestUrl`](modules/constants.js:9)，缓存时间由 [`REMOTE_VERSION_CACHE_MS`](modules/settings-panel.js:140) 控制。

## 8. 美化器与模板系统

### 8.1 模板管理

模板上传和管理入口在 [`bindBeautifierEvents()`](modules/settings-templates.js:15)：

- 上传文件后通过 [`handleFileUpload()`](modules/settings-templates.js:78) 读取内容。
- 扩展名校验由 [`isValidTemplateExtension()`](modules/settings-template-core.js:38) 完成。
- 模板记录创建由 [`createTemplateRecord()`](modules/settings-template-core.js:69) 完成。
- 模板选择由 [`resolveTemplateSelection()`](modules/settings-template-core.js:86) 完成。
- 模板删除由 [`resolveTemplateDeletion()`](modules/settings-template-core.js:111) 完成。
- 模板重命名由 [`resolveTemplateRename()`](modules/settings-template-core.js:157) 完成。

模板上限来自 [`MAX_TEMPLATES`](modules/constants.js:149)。

### 8.2 模板解析与缓存

- 解析入口是 [`parseBeautifierTemplate()`](modules/beautifier.js:22)。
- 解析支持包含 replaceString 的 JSON，也支持直接 HTML。
- 当前活动模板入口是 [`getActiveTemplateData()`](modules/beautifier.js:99)。
- 模板缓存状态在 [`cachedTemplate`](modules/state.js:79)、[`cachedTemplateSource`](modules/state.js:82)、[`cachedTemplateId`](modules/state.js:85)。
- 聊天数据缓存签名由 [`buildChatDataSignature()`](modules/beautifier-cache.js:44) 生成。

### 8.3 美化器渲染

[`renderWithBeautifier()`](modules/beautifier.js:294) 的关键步骤：

1. 将模板中的占位符替换为原始消息或转义后的原始消息，见 [`beautifier.js`](modules/beautifier.js:298) 到 [`beautifier.js`](modules/beautifier.js:308)。
2. 通过 [`extractAllChatData()`](modules/beautifier.js:107) 提供聊天数据和标签数据。
3. 通过 [`injectDataIntoTemplate()`](modules/beautifier.js:211) 注入可供模板使用的数据读取函数。
4. 创建或复用 iframe，并用 Blob URL 加载渲染后的 HTML，见 [`renderWithBeautifier()`](modules/beautifier.js:324) 到 [`renderWithBeautifier()`](modules/beautifier.js:379)。
5. iframe 加载超时由 [`beautifierLoadTimeout`](modules/state.js:93) 管理。

### 8.4 美化器安全边界

这是高风险区域，别把“兼容模板”误写成“安全沙箱”。

- iframe 使用 [`sandbox="allow-scripts allow-same-origin"`](modules/beautifier.js:332)。这允许模板执行脚本，并为访问父页面能力打开了边界。
- 注入脚本显式尝试访问父级 SillyTavern 上下文，见 [`window.parent.SillyTavern`](modules/beautifier.js:232)。
- 注入脚本也会代理 TavernHelper 能力，见 [`TavernHelper`](modules/beautifier.js:247)。
- 结论：模板应视为可信代码，不应加载不可信模板。后续如果要支持第三方模板市场，必须重做权限模型。

## 9. 主题编辑器与按钮系统

### 9.1 主题数据

默认夜间主题定义在 [`themes`](modules/constants.js:179)。自定义主题默认结构定义在 [`defaultCustomTheme`](modules/constants.js:193)。当前主题运行态存在 [`currentTheme`](modules/state.js:62)，编辑中的临时主题存在 [`tempCustomTheme`](modules/state.js:74)。

### 9.2 主题应用

[`applyTheme()`](modules/theme-application.js:6) 是主题真正落地的入口：

- 自定义主题会调用 [`applyThemeStyles()`](modules/utils.js:163) 和 [`applyButtonStyles()`](modules/utils.js:202)，并保存 [`theme`](modules/constants.js:163) 与 [`customTheme`](modules/constants.js:176)。
- 夜间主题会恢复预设样式，并保存 [`theme`](modules/constants.js:163) 为 night。

### 9.3 主题编辑器

- 打开入口是 [`openThemeEditor()`](modules/theme-editor.js:28)，会隐藏普通页签并插入编辑器 DOM。
- 关闭入口是 [`closeThemeEditor()`](modules/theme-editor.js:56)，保存时通过 [`applyTheme()`](modules/theme-application.js:6) 落地。
- 编辑器视图由 [`createThemeEditorContent()`](modules/theme-editor-view.js:1) 生成。
- 按钮编辑事件由 [`bindButtonEditorEvents()`](modules/theme-button-editor.js:1) 管理。
- 颜色选择器入口是 [`initColorPicker()`](modules/theme-color-tools.js:3)。
- 原生吸管或备用取色入口是 [`startEyedropper()`](modules/theme-color-tools.js:244)。

注意：主题编辑器修改的是 [`tempCustomTheme`](modules/state.js:74)。未保存关闭时，应回退到设置里的主题。这一点由 [`closeThemeEditor()`](modules/theme-editor.js:56) 处理。

## 10. 模块职责地图

| 文件 | 核心职责 | 主要修改入口 |
|---|---|---|
| [`manifest.json`](manifest.json:1) | SillyTavern 扩展清单。 | 改扩展元信息、入口脚本、样式声明。 |
| [`package.json`](package.json:1) | Node 测试脚本声明。 | 改测试命令或测试依赖。 |
| [`README.md`](README.md:1) | 面向用户的使用说明和更新日志。 | 改用户可见功能说明。 |
| [`index.js`](index.js:1) | 扩展生命周期编排与 Slash Command。 | 改初始化、卸载、命令注册、窗口开关联动。 |
| [`style.css`](style.css:1) | 扩展全部视觉样式。 | 改窗口、按钮、设置面板、主题编辑器样式。 |
| [`constants.js`](modules/constants.js:1) | 版本、默认设置、图标、主题、提示语。 | 新增设置默认值、改版本、改默认捕获标签、改主题预设。 |
| [`state.js`](modules/state.js:1) | 运行时内存状态和统一资源清理。 | 新增运行态状态、改资源清理策略。 |
| [`settings.js`](modules/settings.js:1) | 设置读取、规范化、迁移、保存。 | 新增设置字段、调整迁移逻辑。 |
| [`events.js`](modules/events.js:1) | 事件常量、事件别名、监听管理器。 | 新增事件类型、修复事件兼容、调整清理策略。 |
| [`runtime.js`](modules/runtime.js:1) | 事件装配、DOM 观察、扫描调度。 | 改捕获触发时机、防抖、初始扫描。 |
| [`capture-core.js`](modules/capture-core.js:1) | 标签提取、关键词门槛、过滤纯逻辑。 | 改捕获规则、标签正则、搜索规则。 |
| [`capture.js`](modules/capture.js:1) | 连接 SillyTavern 聊天数据和捕获状态。 | 改扫描策略、消息校验、捕获去重。 |
| [`window.js`](modules/window.js:1) | 悬浮窗 DOM、拖拽、缩放、按钮事件。 | 改窗口结构、控制按钮、拖拽缩放行为。 |
| [`window-content.js`](modules/window-content.js:1) | 当前内容区渲染。 | 改空态、纯文本回退、美化器切换。 |
| [`window-history.js`](modules/window-history.js:1) | 库存列表、搜索、删除模式。 | 改历史列表 UI、删除行为、搜索展示。 |
| [`toggle-visibility-core.js`](modules/toggle-visibility-core.js:1) | 悬浮按钮可见性纯逻辑。 | 改按钮显示规则。 |
| [`toggle.js`](modules/toggle.js:1) | 悬浮按钮创建、拖拽、样式应用、点击开关。 | 改按钮交互、位置保存、显示策略。 |
| [`settings-panel.js`](modules/settings-panel.js:1) | 设置面板渲染、基础设置、版本提醒。 | 新增设置控件、改版本提示、改重置按钮。 |
| [`settings-template-core.js`](modules/settings-template-core.js:1) | 模板管理纯逻辑。 | 改模板选择、删除、重命名、扩展名规则。 |
| [`settings-templates.js`](modules/settings-templates.js:1) | 模板上传、列表 UI、测试模板、刷新当前内容。 | 改模板管理交互。 |
| [`beautifier-cache.js`](modules/beautifier-cache.js:1) | 聊天数据缓存签名。 | 改缓存失效策略。 |
| [`beautifier.js`](modules/beautifier.js:1) | 模板解析、聊天数据提取、iframe 渲染。 | 改模板兼容、注入 API、iframe 安全策略。 |
| [`theme-application.js`](modules/theme-application.js:1) | 主题应用和保存。 | 改主题落地逻辑。 |
| [`theme-editor.js`](modules/theme-editor.js:1) | 主题编辑器主控。 | 改编辑器打开关闭、临时主题应用。 |
| [`theme-editor-view.js`](modules/theme-editor-view.js:1) | 主题编辑器 HTML 视图。 | 改编辑器结构和控件。 |
| [`theme-button-editor.js`](modules/theme-button-editor.js:1) | 按钮形状、大小、图片编辑。 | 改按钮编辑体验。 |
| [`theme-color-tools.js`](modules/theme-color-tools.js:1) | 调色盘和吸管取色。 | 改颜色选择逻辑。 |
| [`utils.js`](modules/utils.js:1) | 设备检测、颜色转换、位置约束、主题样式、提示语。 | 改通用工具和样式应用辅助。 |

## 11. 依赖方向与耦合点

### 11.1 推荐依赖方向

后续维护应尽量保持以下方向：

1. 纯逻辑模块不依赖 DOM：[`capture-core.js`](modules/capture-core.js:1)、[`settings-template-core.js`](modules/settings-template-core.js:1)、[`toggle-visibility-core.js`](modules/toggle-visibility-core.js:1)、[`beautifier-cache.js`](modules/beautifier-cache.js:1)、[`version-info-core.js`](modules/version-info-core.js:1)。
2. 状态和设置模块服务上层：[`state.js`](modules/state.js:1)、[`settings.js`](modules/settings.js:1)。
3. 运行时模块调度捕获，不直接渲染复杂 UI：[`runtime.js`](modules/runtime.js:1)。
4. UI 模块通过回调和状态读取刷新：[`window.js`](modules/window.js:1)、[`window-content.js`](modules/window-content.js:1)、[`window-history.js`](modules/window-history.js:1)。
5. 设置面板和主题编辑器属于 UI 层，不要让纯逻辑反向依赖它们。

### 11.2 当前强耦合点

| 耦合点 | 证据 | 风险 |
|---|---|---|
| UI 模块直接读写全局状态 | [`window-history.js`](modules/window-history.js:10) 到 [`window-history.js`](modules/window-history.js:16) | 简单但容易让状态更新分散。 |
| 设置面板能直接改变运行态 | [`setExtensionEnabledWithUI()`](modules/settings-panel.js:307) | 改启用逻辑时必须同步按钮、窗口和设置。 |
| 模板设置模块直接调用窗口刷新 | [`settings-templates.js`](modules/settings-templates.js:6) | 模板管理和窗口展示存在耦合。 |
| 美化器 iframe 为兼容模板访问父级能力 | [`window.parent.SillyTavern`](modules/beautifier.js:232) | 安全边界弱，模板必须可信。 |
| 主题编辑使用可变临时对象 | [`tempCustomTheme`](modules/state.js:74) | 浅层误改可能直接影响预览和保存结果。 |

这些耦合不是立刻要拆，但后续 AI 修改时必须知道它们存在。看不到耦合还敢改，等于在闭眼拆炸弹。

## 12. 风险清单

| 风险 | 证据 | 后果 | 建议 |
|---|---|---|---|
| 纯文本回退 XSS | [`renderPlainText()`](modules/window-content.js:33) 中替换无效，最终进入 [`$content.html()`](modules/window-content.js:47) | 捕获内容包含 HTML 或脚本时可能被执行。 | 使用真实 HTML 转义或 DOM textContent 渲染，再安全处理换行和高亮。 |
| 标签名未正则转义 | [`getTagRegex()`](modules/capture-core.js:30) 直接拼接标签名 | 自定义标签含特殊字符会报错或非预期匹配。 | 对标签名做正则转义，并限制合法标签名字符集。 |
| 美化器沙箱边界弱 | [`sandbox="allow-scripts allow-same-origin"`](modules/beautifier.js:332)，且访问 [`window.parent.SillyTavern`](modules/beautifier.js:232) | 不可信模板可接触宿主上下文。 | 文档明确只允许可信模板；若要支持不可信模板，需要移除父级访问能力并设计通信协议。 |
| 库存非持久化 | [`capturedPlots`](modules/state.js:50) 仅为内存数组 | 用户误以为库存跨会话保存会产生数据预期错误。 | 用户文档和维护文档都必须明确库存是当前运行会话内状态。 |
| DOM 交互缺少自动化测试 | 测试集中在 [`tests`](tests) 下纯逻辑文件 | 拖拽、窗口、设置面板、美化器回归风险高。 | 后续引入 DOM 测试或浏览器端冒烟检查。 |
| 版本历史不完整 | [`versionHistory`](modules/constants.js:11) 只包含当前少量版本 | 远端版本跨度较大时，版本说明可能缺条目。 | 发布时同步维护版本历史数组。 |
| 图片按钮存入设置可能膨胀 | [`buttonImage`](modules/constants.js:210) 保存 base64 | 大图可能让扩展设置体积过大。 | 限制图片尺寸或压缩后保存。 |
| 事件与 DOM 双触发可能重复 | [`registerEventListeners()`](modules/runtime.js:184) 和 [`setupMutationObserver()`](modules/runtime.js:82) 同时存在 | 极端情况下重复触发捕获检查。 | 保持消息索引去重，改触发逻辑时先验证重复路径。 |

## 13. 测试现状与补测建议

### 13.1 已有测试

| 测试文件 | 覆盖对象 | 价值 |
|---|---|---|
| [`tests/capture-core.test.js`](tests/capture-core.test.js:1) | [`capture-core.js`](modules/capture-core.js:1) | 覆盖标签提取、关键词门槛、AM 编号和过滤。 |
| [`tests/beautifier-cache.test.js`](tests/beautifier-cache.test.js:1) | [`beautifier-cache.js`](modules/beautifier-cache.js:1) | 覆盖聊天签名变化。 |
| [`tests/settings-template-core.test.js`](tests/settings-template-core.test.js:1) | [`settings-template-core.js`](modules/settings-template-core.js:1) | 覆盖模板扩展名、选择、删除、重命名。 |
| [`tests/toggle-visibility-core.test.js`](tests/toggle-visibility-core.test.js:1) | [`toggle-visibility-core.js`](modules/toggle-visibility-core.js:1) | 覆盖按钮可见性规则。 |
| [`tests/version-info-core.test.js`](tests/version-info-core.test.js:1) | [`version-info-core.js`](modules/version-info-core.js:1) | 覆盖版本比较和累计更新说明。 |

测试脚本声明在 [`package.json`](package.json:5)。

### 13.2 缺失测试

优先补这些，别把 UI 代码当不会坏的装饰品：

1. [`window-content.js`](modules/window-content.js:1)：纯文本回退的真实转义、高亮组合、空态资源释放。
2. [`settings.js`](modules/settings.js:1)：旧配置迁移、异常类型规范化、模板旧字段迁移。
3. [`capture-core.js`](modules/capture-core.js:1)：自定义标签名特殊字符、标签属性、大小写、反引号边界。
4. [`runtime.js`](modules/runtime.js:1)：事件触发去重和聊天切换扫描逻辑，可通过 mock 事件源测试。
5. [`beautifier.js`](modules/beautifier.js:1)：模板解析、占位符替换、Blob URL 释放、聊天数据缓存失效。
6. [`toggle.js`](modules/toggle.js:1)：按钮可见性和隐藏按钮下 Slash Command 打开窗口行为。

## 14. 常见修改入口指南

| 目标 | 必改位置 | 易漏点 |
|---|---|---|
| 新增默认捕获标签 | [`defaultSettings`](modules/constants.js:155) | 只改设置面板占位符无效；捕获核心读取的是规范化后的设置。 |
| 改捕获判定规则 | [`extractPlotContent()`](modules/capture-core.js:84) | 同步更新 [`tests/capture-core.test.js`](tests/capture-core.test.js:1)。 |
| 新增设置项 | [`defaultSettings`](modules/constants.js:155)、[`normalizeSettingsShape()`](modules/settings.js:164)、[`createSettingsPanel()`](modules/settings-panel.js:17) | 必须保证旧用户配置迁移后仍有默认值。 |
| 改窗口按钮 | [`createWindow()`](modules/window.js:33)、[`bindWindowEvents()`](modules/window.js:300)、[`style.css`](style.css:1) | 新按钮要考虑窗口关闭、主题编辑器、删除模式之间的状态冲突。 |
| 改历史库存 | [`window-history.js`](modules/window-history.js:1)、[`capture.js`](modules/capture.js:1) | 删除库存不等于删除聊天消息。 |
| 改美化器模板格式 | [`parseBeautifierTemplate()`](modules/beautifier.js:22)、[`validateTemplate()`](modules/beautifier.js:88)、[`settings-templates.js`](modules/settings-templates.js:1) | 注意缓存失效和旧模板兼容。 |
| 改 iframe 能力 | [`injectDataIntoTemplate()`](modules/beautifier.js:211)、[`renderWithBeautifier()`](modules/beautifier.js:294) | 安全边界会被影响，不能只看模板能不能跑。 |
| 改主题颜色或字体 | [`defaultCustomTheme`](modules/constants.js:193)、[`applyThemeStyles()`](modules/utils.js:163)、[`theme-editor-view.js`](modules/theme-editor-view.js:1) | 预览态和保存态要一致。 |
| 改悬浮按钮外观 | [`applyButtonStyles()`](modules/utils.js:202)、[`theme-button-editor.js`](modules/theme-button-editor.js:1)、[`toggle.js`](modules/toggle.js:1) | 自定义图片、圆形、长条三种路径都要验证。 |
| 改版本提醒 | [`version-info-core.js`](modules/version-info-core.js:1)、[`settings-panel.js`](modules/settings-panel.js:138)、[`versionHistory`](modules/constants.js:11) | 远端版本缓存和本地版本比较要一起看。 |

## 15. 后续 AI 操作守则

1. 改代码前先读目标模块和直接调用方。只看一个文件就下结论，助手，那不是分析，是赌博。
2. 设置项只通过 [`saveSetting()`](modules/settings.js:270)、[`updateSettings()`](modules/settings.js:254)、[`updateBeautifierSettings()`](modules/settings.js:276) 这类入口修改，不要绕过规范化层。
3. 捕获数据更新必须通过 [`setCapturedPlots()`](modules/state.js:148)，并同步触发窗口内容和历史列表刷新。
4. 事件监听优先进入 [`EventListenerManager`](modules/events.js:56)，否则销毁路径可能漏清理。
5. 纯逻辑能抽就抽到类似 [`capture-core.js`](modules/capture-core.js:1) 或 [`settings-template-core.js`](modules/settings-template-core.js:1) 的模块，并补测试。
6. 改美化器必须同时考虑模板兼容、安全边界、Blob URL 释放和 iframe 加载超时。
7. 改主题编辑器必须区分临时预览态 [`tempCustomTheme`](modules/state.js:74) 和持久化设置 [`customTheme`](modules/constants.js:176)。
8. 不要声称库存持久化。当前事实是 [`capturedPlots`](modules/state.js:50) 内存态。

## 16. 当前架构评价

这版架构不是不能维护。模块拆分已经比单文件扩展强很多，纯逻辑也有测试边界。但别高兴得太早，问题也很明确：

- 展示层安全边界不够扎实，尤其是 [`renderPlainText()`](modules/window-content.js:33) 的转义问题。
- 美化器为了兼容强模板能力牺牲了沙箱隔离，见 [`renderWithBeautifier()`](modules/beautifier.js:294)。
- DOM 交互测试几乎为空，真正容易坏的地方没有回归保护。
- 设置、窗口、美化器、主题之间仍有不少 UI 层耦合，后续大改必须先定边界。

这份文档能作为维护接手入口，但还不是生产级质量报告。若要进一步变成重构方案，需要追加真实运行验证、样式审查、浏览器端交互测试和安全修复设计。