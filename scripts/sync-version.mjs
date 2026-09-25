/**
 * Injects the canonical release identity into every file that needs it.
 * Source of truth: public/version.json (version + buildNumber)
 * App identity source: capacitor.config.json (appId + appName)
 *
 * Run automatically by `npm run build` (prebuild) and `npm run cap:sync`.
 * Fails loudly instead of silently drifting when a marker cannot be found.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const write = (rel, content) => writeFileSync(join(root, rel), content, 'utf8');

const meta = JSON.parse(read('public/version.json'));
const capacitor = JSON.parse(read('capacitor.config.json'));

const version = String(meta.version || '').trim();
const buildNumber = Number(meta.buildNumber);
const appId = String(capacitor.appId || '').trim();
const appName = String(capacitor.appName || 'Rust Survival 3D').trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`version.json: invalid version "${version}"`);
if (!Number.isInteger(buildNumber) || buildNumber < 1) throw new Error(`version.json: invalid buildNumber "${meta.buildNumber}"`);
if (!/^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/i.test(appId)) throw new Error(`capacitor.config.json: invalid appId "${appId}"`);

function replaceOnce(label, content, pattern, replacement) {
    if (!pattern.test(content)) throw new Error(`${label}: marker not found — refusing to guess`);
    return content.replace(pattern, replacement);
}

const appScript = `window.RASHID_APP={id:'${appId}',version:'${version}',buildNumber:${buildNumber},name:'${appName}'};`;

let html = read('index.html');
html = replaceOnce('index.html', html, /window\.RASHID_APP=\{[^}]*\};/, appScript);
write('index.html', html);

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== version) {
    pkg.version = version;
    write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`sync-version: package.json → ${version}`);
}

let gradle = read('android/app/build.gradle');
const before = gradle;
gradle = replaceOnce('android/app/build.gradle', gradle, /versionCode\s+\d+/, `versionCode ${buildNumber}`);
gradle = replaceOnce('android/app/build.gradle', gradle, /versionName\s+"[^"]*"/, `versionName "${version}"`);
if (gradle !== before) {
    write('android/app/build.gradle', gradle);
    console.log(`sync-version: build.gradle → ${version} (${buildNumber})`);
}

console.log(`sync-version: ${appName} ${version} (build ${buildNumber}) · ${appId}`);
