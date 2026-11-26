export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'cli' | 'bot' | 'unknown';

export interface ParsedUserAgent {
    browser: string;
    browserName: string;
    browserVersion: string | null;
    os: string;
    osName: string;
    deviceType: DeviceType;
}

interface PatternRule {
    name: string;
    regex: RegExp;
    format?: (match: RegExpMatchArray) => { label: string; version: string | null };
}

const BROWSER_RULES: PatternRule[] = [
    { name: 'Edge', regex: /Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)?)/i },
    { name: 'Opera', regex: /(?:OPR|Opera)\/(\d+(?:\.\d+)?)/i },
    { name: 'Samsung Internet', regex: /SamsungBrowser\/(\d+(?:\.\d+)?)/i },
    { name: 'Brave', regex: /Brave\/(\d+(?:\.\d+)?)/i },
    { name: 'Vivaldi', regex: /Vivaldi\/(\d+(?:\.\d+)?)/i },
    { name: 'Firefox', regex: /(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/i },
    { name: 'Chrome', regex: /(?:Chrome|CriOS)\/(\d+(?:\.\d+)?)/i },
    {
        name: 'Safari',
        regex: /Version\/(\d+(?:\.\d+)?).*Safari\//i,
    },
    { name: 'Safari', regex: /Safari\/(\d+(?:\.\d+)?)/i },
    { name: 'Postman', regex: /PostmanRuntime\/(\d+(?:\.\d+)?)/i },
    { name: 'Insomnia', regex: /Insomnia\/(\d+(?:\.\d+)?)/i },
    { name: 'curl', regex: /curl\/(\d+(?:\.\d+)?)/i },
    { name: 'HTTPie', regex: /HTTPie\/(\d+(?:\.\d+)?)/i },
    { name: 'Node.js', regex: /(?:node|undici|axios)(?:\/(\d+(?:\.\d+)?))?/i },
];

const WINDOWS_VERSION_MAP: Record<string, string> = {
    '10.0': 'Windows 10/11',
    '6.3': 'Windows 8.1',
    '6.2': 'Windows 8',
    '6.1': 'Windows 7',
};

function parseOs(ua: string): { os: string; osName: string } {
    if (/iPad/i.test(ua)) {
        const m = ua.match(/OS (\d+[_.]\d+)/i);
        const ver = m?.[1]?.replace(/_/g, '.');
        return { os: ver ? `iPadOS ${ver}` : 'iPadOS', osName: 'iPadOS' };
    }
    if (/iPhone|iPod/i.test(ua)) {
        const m = ua.match(/OS (\d+[_.]\d+)/i);
        const ver = m?.[1]?.replace(/_/g, '.');
        return { os: ver ? `iOS ${ver}` : 'iOS', osName: 'iOS' };
    }
    if (/Android/i.test(ua)) {
        const m = ua.match(/Android\s+(\d+(?:\.\d+)?)/i);
        return { os: m?.[1] ? `Android ${m[1]}` : 'Android', osName: 'Android' };
    }
    if (/CrOS/i.test(ua)) {
        return { os: 'ChromeOS', osName: 'ChromeOS' };
    }
    if (/Windows NT/i.test(ua)) {
        const m = ua.match(/Windows NT\s+(\d+\.\d+)/i);
        const mapped = m?.[1] ? WINDOWS_VERSION_MAP[m[1]] : undefined;
        return { os: mapped ?? 'Windows', osName: 'Windows' };
    }
    if (/Windows/i.test(ua)) {
        return { os: 'Windows', osName: 'Windows' };
    }
    if (/Mac OS X|Macintosh|Darwin/i.test(ua)) {
        const m = ua.match(/Mac OS X\s+(\d+[_.]\d+(?:[_.]\d+)?)/i);
        if (m?.[1]) {
            const ver = m[1].replace(/_/g, '.').split('.').slice(0, 2).join('.');
            return { os: `macOS ${ver}`, osName: 'macOS' };
        }
        return { os: 'macOS', osName: 'macOS' };
    }
    if (/Ubuntu/i.test(ua)) {
        return { os: 'Ubuntu Linux', osName: 'Linux' };
    }
    if (/Linux/i.test(ua)) {
        return { os: 'Linux', osName: 'Linux' };
    }
    return { os: 'Unknown OS', osName: 'Unknown' };
}

function parseBrowser(ua: string): {
    browser: string;
    browserName: string;
    browserVersion: string | null;
} {
    for (const rule of BROWSER_RULES) {
        const match = ua.match(rule.regex);
        if (!match) continue;
        const version = match[1] ? match[1].split('.')[0] : null;
        return {
            browser: version ? `${rule.name} ${version}` : rule.name,
            browserName: rule.name,
            browserVersion: match[1] ?? null,
        };
    }

    if (/Electron\/(\d+(?:\.\d+)?)/i.test(ua)) {
        const m = ua.match(/Electron\/(\d+(?:\.\d+)?)/i);
        const ver = m?.[1]?.split('.')[0] ?? null;
        return {
            browser: ver ? `Electron ${ver}` : 'Electron',
            browserName: 'Electron',
            browserVersion: m?.[1] ?? null,
        };
    }

    return {
        browser: 'Unknown Browser',
        browserName: 'Unknown',
        browserVersion: null,
    };
}

function detectDeviceType(ua: string, osName: string, browserName: string): DeviceType {
    if (/bot|crawler|spider|slurp|headless/i.test(ua)) {
        return 'bot';
    }
    if (['curl', 'HTTPie', 'Postman', 'Insomnia', 'Node.js'].includes(browserName)) {
        return 'cli';
    }
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
        return 'tablet';
    }
    if (/iPhone|iPod|Mobile|Opera Mini|IEMobile/i.test(ua) || osName === 'iOS') {
        return 'mobile';
    }
    if (['macOS', 'Windows', 'Linux', 'ChromeOS'].includes(osName)) {
        return 'desktop';
    }
    return 'unknown';
}

/**
 * Parses a User-Agent header into structured OS, browser, and device type metadata.
 */
export function parseUserAgent(userAgent?: string | null): ParsedUserAgent {
    const trimmed = userAgent?.trim();
    if (!trimmed) {
        return {
            browser: 'Unknown Browser',
            browserName: 'Unknown',
            browserVersion: null,
            os: 'Unknown OS',
            osName: 'Unknown',
            deviceType: 'unknown',
        };
    }

    const { browser, browserName, browserVersion } = parseBrowser(trimmed);
    const { os, osName } = parseOs(trimmed);
    const deviceType = detectDeviceType(trimmed, osName, browserName);

    return {
        browser,
        browserName,
        browserVersion,
        os,
        osName,
        deviceType,
    };
}
