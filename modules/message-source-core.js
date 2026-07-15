// modules/message-source-core.js
/**
 * 解析用户消息的唯一权威文本来源。
 * 不得在此访问 extra、swipes 或任何候选历史字段。
 *
 * @param {unknown} message
 * @returns {{ kind: 'qrf_plot' | 'mes', text: string, authoritative: boolean } | null}
 */
export function resolveUserMessageSource(message) {
    if (!message || typeof message !== 'object' || message.is_user !== true) {
        return null;
    }

    if (typeof message.qrf_plot === 'string' && message.qrf_plot.trim().length > 0) {
        return {
            kind: 'qrf_plot',
            text: message.qrf_plot,
            authoritative: true,
        };
    }

    if (typeof message.mes === 'string' && message.mes.trim().length > 0) {
        return {
            kind: 'mes',
            text: message.mes,
            authoritative: false,
        };
    }

    return null;
}

/**
 * 生成只包含模板兼容字段的用户楼投影。
 *
 * @param {unknown} message
 * @returns {{ is_user: true, sourceKind: 'qrf_plot' | 'mes', content: string, mes: string, qrf_plot: string } | null}
 */
export function projectUserMessage(message) {
    const source = resolveUserMessageSource(message);
    if (!source) return null;

    return {
        is_user: true,
        sourceKind: source.kind,
        content: source.text,
        mes: source.kind === 'mes' ? source.text : '',
        qrf_plot: source.kind === 'qrf_plot' ? source.text : '',
    };
}
