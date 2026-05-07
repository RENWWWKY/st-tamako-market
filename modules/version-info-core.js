// modules/version-info-core.js
/**
 * 玉子市场 - 版本提示核心逻辑
 * @version 2.9.2
 */

function normalizeVersion(version) {
    return typeof version === 'string' ? version.trim().replace(/^v/i, '') : '';
}

export function compareVersions(leftVersion, rightVersion) {
    const left = normalizeVersion(leftVersion);
    const right = normalizeVersion(rightVersion);

    if (!left || !right) {
        return 0;
    }

    const leftParts = left.split('.').map(part => Number.parseInt(part, 10));
    const rightParts = right.split('.').map(part => Number.parseInt(part, 10));
    const length = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < length; index += 1) {
        const leftPart = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
        const rightPart = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;

        if (leftPart > rightPart) {
            return 1;
        }

        if (leftPart < rightPart) {
            return -1;
        }
    }

    return 0;
}

export function createVersionNoticeState(localVersion, remoteVersion) {
    const local = normalizeVersion(localVersion);
    const remote = normalizeVersion(remoteVersion);
    const hasRemoteUpdate = Boolean(local && remote && compareVersions(remote, local) > 0);

    return {
        shouldShowBadge: hasRemoteUpdate,
        localVersion: local,
        latestVersion: remote || local,
        notesFromVersion: local,
        notesToVersion: remote || local,
    };
}

export function getVersionHistorySince(versionHistory, fromVersion, toVersion) {
    const from = normalizeVersion(fromVersion);
    const to = normalizeVersion(toVersion);

    if (!Array.isArray(versionHistory) || !to) {
        return [];
    }

    return versionHistory.filter(entry => {
        const version = normalizeVersion(entry?.version);
        if (!version) {
            return false;
        }

        const isAtMostTarget = compareVersions(version, to) <= 0;
        const isAfterFrom = from ? compareVersions(version, from) > 0 : true;
        return isAtMostTarget && isAfterFrom;
    });
}
