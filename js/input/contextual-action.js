// ============================================================
// RUSTGAME — Phase 2.4: contextual interact control (mobile)
// The phone has no E key, but the desktop E is the backbone of the
// game: open a storage box, drink, cook, loot a crate, loot a
// corpse. This module derives what a touch button should show and
// do, so the rule lives in one testable place instead of in the
// DOM layer.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

export const CONTEXTUAL_ACTION = 'interact';
export const DEFAULT_CONTEXTUAL_LABEL = '✋';

/**
 * "E — Open storage box" → "Open storage box".
 * The button IS the E key, so repeating the key in the label is noise.
 */
export function stripKeyPrefix(prompt) {
    if (typeof prompt !== 'string') return '';
    return prompt.replace(/^\s*[A-Za-z0-9]+\s*[—–-]\s*/, '').trim();
}

/**
 * Fits a prompt into a button. The words are the meaning, so we cut on a
 * word boundary rather than mid-word.
 */
export function toButtonLabel(prompt, maxChars = 16) {
    const text = stripKeyPrefix(prompt);
    if (!text) return DEFAULT_CONTEXTUAL_LABEL;
    if (text.length <= maxChars) return text;

    const cut = text.slice(0, maxChars);
    const space = cut.lastIndexOf(' ');
    const short = space > 4 ? cut.slice(0, space) : cut;
    return `${short.trim()}…`;
}

/**
 * The state of the contextual button.
 * @param {{prompt?: string|null, hasTarget?: boolean}} input
 * @returns {{visible: boolean, label: string, action: string}}
 */
export function contextualButtonState({ prompt = null, hasTarget = false } = {}) {
    if (!hasTarget) {
        return { visible: false, label: DEFAULT_CONTEXTUAL_LABEL, action: CONTEXTUAL_ACTION };
    }
    return { visible: true, label: toButtonLabel(prompt), action: CONTEXTUAL_ACTION };
}

/**
 * What a tap on the contextual control does. Mirrors the desktop E:
 * interact with whatever is in front of you, otherwise fall back to the
 * inventory panel (the desktop E opens it when there is no target).
 */
export function resolveContextualTap({ hasTarget = false } = {}) {
    return hasTarget ? 'interact' : 'inventory';
}
