// ============================================================
// RUSTGAME — Vite configuration
// - base: './'    → relative URLs (Capacitor file:// + subfolder hosting)
// - outDir: 'www' → matches capacitor.config.json webDir
// ============================================================
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        outDir: 'www',
        emptyOutDir: true,
        target: 'es2020',
        chunkSizeWarningLimit: 1600,
    },
    server: {
        host: true, // allow LAN/device testing on phones
        port: 5173,
        strictPort: false,
    },
    preview: {
        host: true,
        port: 4173,
    },
});
