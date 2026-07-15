// modules/constants.js
/**
 * 玉子市场 - 常量定义
 * @version 2.10.0
 */

export const extensionName = 'TamakoMarket';
export const extensionVersion = '2.10.0';
export const remoteManifestUrl = 'https://raw.githubusercontent.com/yuzi83/st-tamako-market/main/manifest.json';

export const versionHistory = [
    {
        version: '2.10.0',
        title: '捕获可靠性与安全渲染改进',
        notes: [
            '统一用户消息来源规则，优先使用顶层 qrf_plot，并在延迟写入、编辑、删除、滑动和聊天切换后自动对账。',
            '普通展示模式支持安全 Markdown 渲染、分段展示和宽表横向滚动，渲染异常时降级为纯文本。',
            '收紧美化器数据边界与占位符编码，避免暴露非用户消息数据并阻断脚本上下文逃逸。',
        ],
    },
    {
        version: '2.9.2',
        title: '设置页更新提示',
        notes: [
            '设置标题旁新增 NEW 标记：当检测到远端最新版本高于本地安装版本时显示。',
            '设置页新增“版本说明”按钮：可查看从本地安装版本到远端最新版本之间的累计更新内容。',
            '点击版本说明只负责展示更新内容，不会把 NEW 当成已读提示隐藏。',
        ],
    },
    {
        version: '2.9.1',
        title: 'Quick Reply 联动与隐藏悬浮按钮',
        notes: [
            '新增 /tamako-toggle、/tamako-open 与 /tamako-close Slash Command，可直接被 Quick Reply 按钮调用。',
            '扩展设置新增“隐藏悬浮窗按钮”，适合只用 QR 控制窗口的用户。',
            '新增可导入的“玉子市场qr” Quick Reply 文件，默认提供单个“玉子市场”切换按钮。',
        ],
    },
];

export const ICONS = {
    store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9.5L12 4L21 9.5"/>
        <path d="M5 9.5V19C5 19.5523 5.44772 20 6 20H18C18.5523 20 19 19.5523 19 19V9.5"/>
        <rect x="9" y="13" width="6" height="7" rx="1"/>
        <circle cx="12" cy="9" r="2"/>
    </svg>`,
    
    minimize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M6 12H18"/>
    </svg>`,
    
    expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 6V18M6 12H18"/>
    </svg>`,
    
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="10.5" cy="10.5" r="6"/>
        <path d="M15 15L20 20"/>
    </svg>`,
    
    broom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3V10"/>
        <path d="M8 10C8 10 6 14 6 17C6 19 8 21 12 21C16 21 18 19 18 17C18 14 16 10 16 10"/>
        <path d="M8 10H16"/>
        <path d="M9 14H15"/>
        <path d="M10 17H14"/>
    </svg>`,
    
    palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="8" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
        <circle cx="16" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
        <path d="M14 14C14 15.6569 15.3431 17 17 17C17 17 19 17 19 15C19 13 17 13 17 11"/>
    </svg>`,
    
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15.5 5.5L18.5 8.5"/>
        <path d="M6 19L5 21L7 20L19 8C19.5523 7.44772 19.5523 6.55228 19 6L18 5C17.4477 4.44772 16.5523 4.44772 16 5L4 17L4.5 18.5"/>
        <path d="M14.5 6.5L17.5 9.5"/>
    </svg>`,
    
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M6 6L18 18M18 6L6 18"/>
    </svg>`,
    
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3L14.5 8.5L20.5 9.5L16 14L17 20L12 17.5L7 20L8 14L3.5 9.5L9.5 8.5L12 3Z" fill="currentColor" opacity="0.2"/>
        <path d="M12 3L14.5 8.5L20.5 9.5L16 14L17 20L12 17.5L7 20L8 14L3.5 9.5L9.5 8.5L12 3Z"/>
    </svg>`,
    
    box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 8L12 3L21 8V16L12 21L3 16V8Z"/>
        <path d="M12 12L21 8"/>
        <path d="M12 12L3 8"/>
        <path d="M12 12V21"/>
        <circle cx="12" cy="8" r="1" fill="currentColor"/>
    </svg>`,
    
    pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 21C12 21 19 14.5 19 9.5C19 5.35786 15.866 2 12 2C8.13401 2 5 5.35786 5 9.5C5 14.5 12 21 12 21Z"/>
        <circle cx="12" cy="9.5" r="2.5" fill="currentColor" opacity="0.3"/>
        <circle cx="12" cy="9.5" r="2.5"/>
    </svg>`,
    
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6H20"/>
        <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6"/>
        <path d="M6 6V19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19V6"/>
        <path d="M10 10V17"/>
        <path d="M14 10V17"/>
    </svg>`,
    
    eyedropper: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 4C20.5 4.5 21 5.5 21 6.5C21 7.5 20.5 8.5 20 9L18 11L13 6L15 4C15.5 3.5 16.5 3 17.5 3C18.5 3 19.5 3.5 20 4Z"/>
        <path d="M13 6L18 11L9 20H4V15L13 6Z"/>
        <circle cx="6.5" cy="17.5" r="1"/>
    </svg>`,
    
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12L10 17L19 7"/>
    </svg>`,
    
    reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12C4 7.58172 7.58172 4 12 4C15.0736 4 17.7355 5.69852 19 8.17"/>
        <path d="M20 12C20 16.4183 16.4183 20 12 20C8.92638 20 6.26449 18.3015 5 15.83"/>
        <path d="M16 8H20V4"/>
        <path d="M8 16H4V20"/>
    </svg>`,
    
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="8" y="8" width="12" height="12" rx="2"/>
        <path d="M16 8V6C16 4.89543 15.1046 4 14 4H6C4.89543 4 4 4.89543 4 6V14C4 15.1046 4.89543 16 6 16H8"/>
    </svg>`,
    
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="8.5" cy="8.5" r="2"/>
        <path d="M21 15L16 10L6 21"/>
    </svg>`,
    
    sparkle: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"/>
        <path d="M18 14L19 17L22 18L19 19L18 22L17 19L14 18L17 17L18 14Z" opacity="0.6"/>
        <path d="M6 16L6.5 18L4 18.5L6.5 19L7 21L7.5 19L10 18.5L7.5 18L6 16Z" opacity="0.4"/>
    </svg>`,
    
    boxEmpty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 8L12 3L21 8V16L12 21L3 16V8Z"/>
        <path d="M12 12L21 8"/>
        <path d="M12 12L3 8"/>
        <path d="M12 12V21"/>
    </svg>`,
};

export const MAX_TEMPLATES = 10;

export const BUTTON_SIZE_MIN = 0.6;
export const BUTTON_SIZE_MAX = 1.5;
export const BUTTON_SIZE_DEFAULT = 1.0;

export const defaultSettings = {
    enabled: true,
    windowX: null,
    windowY: null,
    windowWidth: 380,
    windowHeight: 450,
    autoCapture: true,
    captureTags: ['recall', 'scene_direction'],
    theme: 'night',
    maxScanMessages: 50,
    maxStoredPlots: 50,
    toggleX: null,
    toggleY: null,
    hideToggleButton: false,
    remoteVersion: '',
    remoteVersionCheckedAt: 0,
    beautifier: {
        enabled: false,
        activeTemplateId: null,
        templates: []
    },
    customTheme: null,
};

export const themes = {
    night: { 
        name: '夜间模式', 
        primary: '#9370DB', 
        secondary: '#6A5ACD', 
        bg: 'linear-gradient(135deg, #2D2D3A 0%, #1E1E28 50%, #252532 100%)', 
        surface: '#1E1E28', 
        surfaceAlt: '#2D2D3A', 
        text: '#E0E0E0', 
        textMuted: '#888888', 
        border: '#3D3D4A' 
    },
};

export const defaultCustomTheme = {
    name: '自定义',
    basedOn: 'night',
    colors: {
        primary: '#9370DB',
        secondary: '#6A5ACD',
        bg: 'linear-gradient(135deg, #2D2D3A 0%, #1E1E28 50%, #252532 100%)',
        surface: '#1E1E28',
        surfaceAlt: '#2D2D3A',
        text: '#E0E0E0',
        textMuted: '#888888',
        border: '#3D3D4A'
    },
    opacity: 100,
    fontFamily: 'system',
    buttonShape: 'bar',
    buttonSize: 1.0,
    buttonImage: null
};

export const fontOptions = {
    system: { name: '系统默认', value: "'Segoe UI', 'Microsoft YaHei', sans-serif" },
    cute: { name: '可爱圆润', value: "'Comic Sans MS', 'Microsoft YaHei', cursive" },
    elegant: { name: '优雅衬线', value: "Georgia, 'Noto Serif SC', serif" },
    mono: { name: '等宽代码', value: "Consolas, 'Source Code Pro', monospace" },
    rounded: { name: '圆体', value: "'Yuanti SC', 'Microsoft YaHei', sans-serif" },
    songti: { name: '宋体', value: "'Noto Serif SC', 'SimSun', serif" },
    heiti: { name: '黑体', value: "'Noto Sans SC', 'SimHei', sans-serif" },
    kaiti: { name: '楷体', value: "'STKaiti', 'KaiTi', serif" }
};

export const deraMessages = {
    empty: ['空空如也~', '等待中...', '暂无内容'],
    newItem: ['发现新内容', '有新的了', '捕获成功'],
    scanning: ['正在搜寻...', '扫描中...', '请稍等...'],
    found: ['找到了', '搜寻完毕', '已更新'],
    delete: ['已清理', '删除完成', '清理完毕'],
    noResult: ['没找到', '无匹配内容', '试试其他关键词'],
    tooMany: ['内容太多了', '只取了一部分'],
    loading: ['准备中...', '稍等...', '加载中...'],
    theme: ['主题已切换', '新风格', '已更新'],
    templateSaved: ['模板已保存', '收藏成功', '保存完毕'],
    templateDeleted: ['模板已移除', '删除成功'],
    templateSwitch: ['切换成功', '已应用', '生效了'],
    buttonUpdated: ['按钮更新了', '新造型', '完成'],
};
