// ============================================================
// RUSTGAME — Electron shell (desktop .exe target)
// Loads the same www/ build as web/APK. Renderer stays a plain
// web page: no Node in the page, isolated preload only.
// .cjs: package.json is "type": "module", so CommonJS is required.
// ============================================================

const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

const DIST_INDEX = path.join(__dirname, '..', 'www', 'index.html');

// Remote ad networks are web/APK business — never inside the .exe.
const BLOCKED_AD_HOSTS = [
    '*://pagead2.googlesyndication.com/*',
    '*://googleads.g.doubleclick.net/*',
    '*://tpc.googlesyndication.com/*',
];

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        autoHideMenuBar: true,
        backgroundColor: '#0b0e14',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    session.defaultSession.webRequest.onBeforeRequest({ urls: BLOCKED_AD_HOSTS }, (details, callback) => {
        callback({ cancel: true });
    });

    win.loadFile(DIST_INDEX);
    return win;
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
