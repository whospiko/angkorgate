import { parseUserAgent } from './user-agent.util';

describe('parseUserAgent', () => {
    it('parses macOS Chrome desktop user agent', () => {
        const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
        expect(parseUserAgent(ua)).toEqual({
            browser: 'Chrome 131',
            browserName: 'Chrome',
            browserVersion: '131.0',
            os: 'macOS 10.15',
            osName: 'macOS',
            deviceType: 'desktop',
        });
    });

    it('parses Windows Edge desktop user agent', () => {
        const ua =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68';
        expect(parseUserAgent(ua)).toMatchObject({
            browser: 'Edge 130',
            browserName: 'Edge',
            os: 'Windows 10/11',
            osName: 'Windows',
            deviceType: 'desktop',
        });
    });

    it('parses iPhone Safari mobile user agent', () => {
        const ua =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
        expect(parseUserAgent(ua)).toMatchObject({
            browser: 'Safari 18',
            browserName: 'Safari',
            os: 'iOS 18.1',
            osName: 'iOS',
            deviceType: 'mobile',
        });
    });

    it('parses Android tablet user agent', () => {
        const ua =
            'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
        expect(parseUserAgent(ua)).toMatchObject({
            browser: 'Chrome 129',
            os: 'Android 14',
            deviceType: 'tablet',
        });
    });

    it('parses CLI tools such as curl', () => {
        expect(parseUserAgent('curl/8.7.1')).toMatchObject({
            browser: 'curl 8',
            browserName: 'curl',
            os: 'Unknown OS',
            deviceType: 'cli',
        });
    });

    it('returns unknown metadata when user agent is empty', () => {
        expect(parseUserAgent(null)).toEqual({
            browser: 'Unknown Browser',
            browserName: 'Unknown',
            browserVersion: null,
            os: 'Unknown OS',
            osName: 'Unknown',
            deviceType: 'unknown',
        });
    });
});
