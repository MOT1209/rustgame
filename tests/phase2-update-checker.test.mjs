import { describe, it, expect } from 'vitest';
import { compareVersions, isNewer, safeDownloadUrl } from '../js/release/version-compare.js';

describe('compareVersions', () => {
    it('orders dotted versions numerically, not lexically', () => {
        expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
        expect(compareVersions('1.1.0', '1.1.1')).toBe(-1);
        expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    });

    it('treats missing segments as zero', () => {
        expect(compareVersions('1.2', '1.2.0')).toBe(0);
    });
});

describe('isNewer', () => {
    it('trusts the build number when both sides have one', () => {
        expect(isNewer({ version: '1.1.0', buildNumber: 16 }, { version: '1.1.0', buildNumber: 15 })).toBe(true);
        expect(isNewer({ version: '1.1.0', buildNumber: 15 }, { version: '1.1.0', buildNumber: 15 })).toBe(false);
    });

    it('never prompts for a downgrade, even if the version string says otherwise', () => {
        expect(isNewer({ version: '1.0.9', buildNumber: 3 }, { version: '1.1.0', buildNumber: 15 })).toBe(false);
    });

    it('falls back to the version string when a build number is missing', () => {
        expect(isNewer({ version: '1.2.0' }, { version: '1.1.0' })).toBe(true);
        expect(isNewer({ version: '1.1.0' }, { version: '1.1.0', buildNumber: 0 })).toBe(false);
    });

    it('does not prompt a fresh install whose local build equals the remote one', () => {
        expect(isNewer({ version: '1.1.0', buildNumber: 15 }, { version: '1.1.0', buildNumber: 15 })).toBe(false);
    });
});

describe('safeDownloadUrl', () => {
    it('accepts http(s) targets', () => {
        expect(safeDownloadUrl('https://example.com/app.apk', 'https://game.example/')).toBe('https://example.com/app.apk');
        expect(safeDownloadUrl('/dl/app.apk', 'https://game.example/x/')).toBe('https://game.example/dl/app.apk');
    });

    it('rejects script and data URLs', () => {
        expect(safeDownloadUrl('javascript:alert(1)', 'https://game.example/')).toBeNull();
        expect(safeDownloadUrl('data:text/html,<script>', 'https://game.example/')).toBeNull();
    });

    it('rejects the missing apkUrl that used to render href="undefined"', () => {
        expect(safeDownloadUrl(undefined, 'https://game.example/')).toBeNull();
        expect(safeDownloadUrl('', 'https://game.example/')).toBeNull();
    });
});
