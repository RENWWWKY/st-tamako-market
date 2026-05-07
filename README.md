# 🏪 玉子市场 Tamako Market

[![GitHub release](https://img.shields.io/github/v/release/yuzi83/st-tamako-market)](https://github.com/yuzi83/st-tamako-market/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SillyTavern 可爱风格悬浮窗扩展，用于捕获和管理特定标签内容。

## ✨ 功能特色

- 🌙 **夜间模式 + 自定义主题** - 默认深色护眼风格，支持完全自定义
- 🎨 **主题编辑器** - 自由调整颜色、透明度、字体
- 🔘 **按钮自定义** - 形状（长条/圆形）、大小、自定义图片
- 🆕 **远端更新提醒** - 检测到 GitHub 最新版本高于本地安装版本时，设置标题旁显示 NEW，点击“版本说明”查看累计更新
- ⚡ **Quick Reply 联动** - 可导入配套 QR，通过单个 `/tamako-toggle` 按钮打开/关闭窗口
- 👁️ **隐藏悬浮按钮** - 想只用 QR 控制窗口时，可在设置中隐藏悬浮窗按钮
- 🔍 **智能搜索** - 支持 AM 编号和关键词搜索
- 🐔 **德拉小助手** - 可爱的状态提示语
- 📦 **库存管理** - 历史记录查看与管理
- 🧹 **选择性删除** - 批量清理不需要的记录
- 🏷️ **自定义标签** - 灵活配置捕获规则
- 🖱️ **自由拖拽** - 可调整窗口和按钮位置，窗口可缩放
- 📱 **移动端支持** - 完美支持手机端触摸操作
- 🎭 **多模板美化器** - 支持保存多个 HTML 模板并自由切换
- 🔄 **自动同步** - 消息删除时自动更新捕获内容
- 🎯 **吸管取色** - PC 端支持从屏幕任意位置吸取颜色（支持原生 EyeDropper API）

## 📥 安装方法

### 方法一：URL 安装（推荐）

1. 打开 SillyTavern
2. 进入 **扩展** → **安装扩展**
3. 输入仓库地址：`https://github.com/yuzi83/st-tamako-market`
4. 点击安装，然后重启 SillyTavern

### 方法二：手动安装

1. [下载最新版本](https://github.com/yuzi83/st-tamako-market/releases)
2. 解压到 SillyTavern 的 `SillyTavern-1.15.0\public\scripts\extensions\third-party` 目录
3. 重启 SillyTavern

## 🎯 使用方法

### 基本操作

1. 点击 **🏪 玉子市场** 按钮打开窗口
2. 扩展会自动捕获包含指定标签的用户消息
3. 在 **📦 库存** 中查看历史记录

### Quick Reply 联动

扩展会注册 SillyTavern Slash Command，方便 Quick Reply 按钮调用：

| 命令 | 功能 |
|------|------|
| `/tamako-toggle` | 切换玉子市场窗口：关闭时打开，打开时关闭 |
| `/tamako-open` | 打开玉子市场窗口 |
| `/tamako-close` | 关闭玉子市场窗口 |

可导入的 Quick Reply 文件为 `玉子市场qr.json`，默认只提供一个 **玉子市场** 按钮：

```json
{
  "version": 2,
  "name": "玉子市场qr",
  "disableSend": false,
  "placeBeforeInput": false,
  "injectInput": false,
  "color": "rgba(0, 0, 0, 0)",
  "onlyBorderColor": false,
  "qrList": [
    {
      "id": 1,
      "showLabel": true,
      "label": "玉子市场",
      "title": "打开或关闭玉子市场悬浮窗",
      "message": "/tamako-toggle",
      "contextList": [],
      "preventAutoExecute": true,
      "isHidden": false,
      "executeOnStartup": false,
      "executeOnUser": false,
      "executeOnAi": false,
      "executeOnChatChange": false,
      "executeOnGroupMemberDraft": false,
      "executeOnNewChat": false,
      "executeBeforeGeneration": false,
      "automationId": ""
    }
  ],
  "idIndex": 1
}
```

如果只想用 Quick Reply 控制窗口，可在扩展设置中勾选 **隐藏悬浮窗按钮**。该选项只隐藏入口按钮，不会禁用窗口、自动捕获或美化器。

### 窗口按钮说明

| 按钮 | 功能 |
|:----:|------|
| ➖ | 最小化窗口 |
| 🔍 | 扫描历史消息 |
| 🧹 | 进入删除模式 |
| 🎨 | 切换主题 |
| ✏️ | 打开主题编辑器 |
| ✖ | 关闭窗口 |

### 拖拽功能

- **窗口拖拽**：拖拽窗口标题栏可移动窗口位置
- **按钮拖拽**：拖拽"玉子市场"按钮可移动按钮位置
- **窗口缩放**：拖拽窗口右边/下边/右下角可调整大小
- **位置记忆**：所有位置会自动保存

### 默认捕获标签

- `recall`
- `scene_direction`

可在设置中自定义添加其他标签。

## 🎭 美化器功能

多模板美化器，支持保存多个 HTML 模板并自由切换。

### 使用方法

1. 在扩展设置中找到 **🎨 今日特选美化器**
2. 勾选 **启用美化器**
3. 点击上传区域，选择你的 HTML 模板文件
4. 模板会自动保存到列表中并激活
5. 可以继续上传更多模板（最多 10 个）
6. 使用下拉框或列表中的"使用"按钮切换模板

### 模板管理

| 操作 | 说明 |
|------|------|
| 使用 | 切换到该模板 |
| ✏️ | 重命名模板 |
| 🗑️ | 删除模板 |
| 测试当前 | 预览当前选中模板的效果 |
| 清空全部 | 删除所有已保存的模板 |

### 支持的文件格式

- `.html` - 标准 HTML 文件
- `.htm` - HTML 文件
- `.json` - 包含 `replaceString` 字段的 JSON 文件（兼容正则脚本格式）
- `.txt` - 纯文本 HTML 内容

### 模板开发

模板使用 `$1` 占位符接收原始用户消息。模板内可使用以下全局变量和函数：

- `window.getSTChat()` - 获取聊天数据（推荐）
- `window.getContext()` - 获取 SillyTavern 上下文

**TavernHelper API**：
- `window.getChatLorebook()` - 获取聊天世界书
- `window.getVariables()` - 获取变量
- `window.getCharLorebooks()` - 获取角色世界书
- `window.getCurrentCharPrimaryLorebook()` - 获取当前角色主世界书
- `window.getLorebookSettings()` - 获取世界书设置
- `window.getLorebookEntries()` - 获取世界书条目

**兼容性说明**：美化器完全兼容现有的正则脚本模板（如回响），模板自带的数据获取函数会被优先使用。

## 🎨 主题编辑器

支持完全自定义主题样式。

### 可调整选项

- **颜色设置** - 主色、辅色、表面色、次要表面色、文字色、次要文字色共 6 种颜色
- **透明度** - 50%-100% 窗口透明度
- **字体选择** - 8 种字体可选
- **按钮形状** - 长条形 / 圆形
- **按钮大小** - 60%-150% 自由缩放
- **按钮图片** - 支持上传自定义图片替换按钮外观

### 字体选项

| 字体 | 描述 |
|------|------|
| 📱 系统默认 | Segoe UI / 微软雅黑 |
| 🎀 可爱圆润 | Comic Sans MS |
| 📜 优雅衬线 | Georgia / Noto Serif |
| 💻 等宽代码 | Consolas |
| ⭕ 圆体 | 苹方圆体 |
| 📖 宋体 | Noto Serif SC / 宋体 |
| 🔲 黑体 | Noto Sans SC / 黑体 |
| 🖌️ 楷体 | 楷体 |

### 吸管取色（仅 PC 端）

点击颜色输入框旁的吸管按钮，可从屏幕任意位置吸取颜色。支持原生 EyeDropper API（Chrome 95+）或 CSS 计算样式备用方案。

## ⚙️ 设置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 启用扩展 | 开启/关闭扩展功能 | ✅ 开启 |
| 自动捕获 | 自动捕获新消息 | ✅ 开启 |
| 隐藏悬浮窗按钮 | 隐藏页面上的玉子市场悬浮按钮，保留 Quick Reply 与设置面板入口 | ❌ 关闭 |
| 捕获标签 | 要捕获的 XML 标签名 | recall, scene_direction |
| 扫描消息数 | 每次扫描的最大消息数 | 50 |
| 最大存储数 | 库存最大保存记录数 | 50 |
| 启用美化器 | 使用自定义模板显示 | ❌ 关闭 |

## 🐔 德拉小助手

德拉会在不同状态下显示可爱的提示语：

- 💤 **空闲时**：「空空如也~」
- ✨ **新货到**：「发现新内容」
- 🔍 **搜索中**：「正在搜寻...」
- 📦 **清理后**：「已清理」
- 🎨 **换主题**：「主题已切换」
- 🎭 **换模板**：「切换成功」
- 🔘 **按钮更新**：「按钮更新了」

## 🔧 兼容性

- SillyTavern 1.10.0 及以上版本
- 支持所有现代浏览器（Chrome、Firefox、Edge 等）
- 📱 支持手机端（Android / iOS）
- 🎭 兼容现有正则脚本模板（如回响 V6）
- 📚 支持回响模板的世界书功能

## 📝 更新日志

### v2.9.2

- 🆕 **设置页 NEW 标记** - 检测到 GitHub 远端最新版本高于本地安装版本后，在“玉子市场”设置标题旁显示 NEW
- 🧾 **版本说明按钮** - 设置页新增“版本说明”，点击后显示从本地安装版本到远端最新版本之间的累计更新内容
- ✅ **本地已是最新则不提示** - 本地版本等于远端版本时不显示 NEW；点击版本说明不会影响 NEW 状态

### v2.9.1

- ⚡ **Quick Reply 联动** - 新增 `/tamako-toggle`、`/tamako-open` 与 `/tamako-close` Slash Command，可直接被 Quick Reply 按钮调用
- 👁️ **隐藏悬浮按钮选项** - 扩展设置新增“隐藏悬浮窗按钮”，适合只用 QR 控制窗口的用户
- 🧾 **补充 QR 导入说明** - README 提供“玉子市场qr”可导入 JSON 内容

### v2.9.0

- 🏗️ **架构全面重构** - 模块从 9 个拆分为 20 个，职责边界更清晰，入口文件缩减 75%
- 🧪 **测试基础设施** - 新增 Node.js 测试框架（`package.json`），首批 3 个单元测试模块覆盖核心逻辑
- 📦 **新增模块拆分**：
  - `beautifier-cache.js` - 美化器缓存独立管理
  - `capture-core.js` - 捕获核心逻辑与 DOM 解耦
  - `settings-template-core.js` - 设置模板核心引擎
  - `settings-templates.js` - 设置模板注册与渲染
  - `settings.js` - 设置状态管理
  - `runtime.js` - 运行时生命周期管理
  - `theme-application.js` - 主题应用逻辑
  - `theme-button-editor.js` - 按钮编辑器
  - `theme-color-tools.js` - 颜色工具集
  - `theme-editor-view.js` - 主题编辑器视图
  - `toggle.js` - 扩展开关控制
  - `window-content.js` - 窗口内容渲染
  - `window-history.js` - 窗口历史记录管理
- 🎯 **关注点分离** - 主题编辑器拆分为 5 个子模块（应用/按钮编辑/颜色工具/视图/主控），设置面板拆分为 3 个子模块
- 🔧 **可测试性提升** - 核心逻辑与 SillyTavern API 解耦，支持纯函数单元测试
- 🧹 **CSS 精简** - 从 39212 字符优化至 36604 字符，移除冗余规则

### v2.8.6

- 🔧 **事件系统重构** - 新增 `EventListenerManager` 统一管理事件监听，规范化事件类型
- 📦 **新增 events.js 模块** - 定义 `EventTypes` 常量和事件别名兼容映射
- 🧹 **统一资源清理** - 新增 `cleanupAllResources()` 函数，确保所有监听器正确清理
- 📝 **JSDoc 类型注释** - 为关键函数和模块添加完整类型定义，提升代码可维护性
- ⚡ **性能优化** - 正则表达式预编译缓存（提升约 90%）、Set 优化索引查找（提升约 70%）
- 🔒 **安全访问** - 新增 `getSTContext()` 和 `getEventSource()` 安全访问函数
- 🎯 **代码质量** - 参考 SillyTavern 官方架构文档优化实现

### v2.8.5

- 🧹 **事件监听清理增强** - 新增 EventSource 监听追踪与统一反注册，避免重复初始化后的回调叠加
- 🖱️ **拖拽监听生命周期修复** - 按钮与窗口的 pointer/contextmenu 监听纳入统一清理链路
- 🔁 **聊天切换触发去重** - 对 chat_changed 系列事件增加短窗去重与防抖，减少重复扫描
- ✅ **捕获校验逻辑优化** - 改为按消息索引重提取验证，降低误判与不必要的全量重建
- ⚙️ **启用状态一致性修复** - 对齐设置态与运行态，确保"禁用"状态真实生效

### v2.8.4

- 📚 **TavernHelper API 注入** - 支持回响等模板的世界书访问（需安装 JS-Slash-Runner 扩展）
- 🔒 **安全性增强** - 用户内容 HTML 转义，防止 XSS 攻击
- 🧹 **内存泄漏修复** - 添加扩展销毁函数，清理事件监听器和 blob URL
- ⚡ **CSS 简化** - 移除未使用的主题变体，精简代码

### v2.8.3

- 🔘 **新增按钮自定义** - 支持长条形/圆形切换、大小缩放（60%-150%）、自定义图片
- 🎨 按钮实时预览 - 编辑器内直接预览按钮外观
- 🖼️ 支持上传 jpg/png/gif 图片替换按钮
- ⚡ 主题系统简化 - 默认使用夜间模式，移除多余预设
- 🐛 修复各类样式和交互问题

### v2.6.0

- 🎭 **新增多模板切换功能** - 可保存最多 10 个美化模板并自由切换
- 📦 模板管理 - 支持重命名、删除模板
- 🔄 自动迁移 - 旧版单模板设置自动迁移到新结构
- 🏗️ 代码模块化重构 - 提升可维护性和性能
- ✨ 新增模板切换提示语

### v2.5.3

- 🗑️ 移除背景渐变设置（简化编辑器）
- ✨ 新增更多字体选项
- ✨ 新增字体实时预览功能

### v2.5.0

- 🎨 **新增主题编辑器**
- 🎯 **新增吸管取色**
- 🎨 新增调色盘组件
- 📦 自定义主题自动保存

### v2.4.0

- 🎭 **新增美化器功能**
- 🎨 CSS 重构：使用变量驱动主题系统

### v2.0.0

- ✨ 新增主题系统
- ✨ 新增智能搜索功能
- ✨ 新增德拉小助手提示

## 📁 项目结构

    TamakoMarket/
    ├── index.js                      # 入口文件
    ├── style.css                     # 样式表
    ├── manifest.json                 # 扩展配置
    ├── package.json                  # 测试框架配置
    ├── README.md                     # 说明文档
    ├── modules/                      # 模块目录
    │   ├── constants.js              # 常量定义
    │   ├── state.js                  # 状态管理
    │   ├── utils.js                  # 工具函数
    │   ├── runtime.js                # 运行时生命周期
    │   ├── toggle.js                 # 扩展开关控制
    │   ├── beautifier.js             # 美化器主控
    │   ├── beautifier-cache.js       # 美化器缓存管理
    │   ├── capture.js                # 消息捕获（DOM 层）
    │   ├── capture-core.js           # 捕获核心逻辑（纯函数）
    │   ├── settings.js               # 设置状态管理
    │   ├── settings-panel.js         # 设置面板渲染
    │   ├── settings-template-core.js # 设置模板核心引擎
    │   ├── settings-templates.js     # 设置模板注册与渲染
    │   ├── theme-editor.js           # 主题编辑器主控
    │   ├── theme-application.js      # 主题应用逻辑
    │   ├── theme-button-editor.js    # 按钮编辑器
    │   ├── theme-color-tools.js      # 颜色工具集
    │   ├── theme-editor-view.js      # 主题编辑器视图
    │   ├── window.js                 # 窗口管理
    │   ├── window-content.js         # 窗口内容渲染
    │   └── window-history.js         # 窗口历史记录
    └── tests/                        # 测试目录
        ├── beautifier-cache.test.js  # 美化器缓存测试
        ├── capture-core.test.js      # 捕获核心逻辑测试
        └── settings-template-core.test.js # 设置模板引擎测试

## 📄 许可证

[MIT License](LICENSE)

---

德拉：欢迎光临玉子市场！🐔✨

