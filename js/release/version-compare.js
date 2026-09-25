/**
 * Pure release-comparison helpers shared by the update checker and unit tests.
 * No DOM, no storage, no side effects.
 */

export function compareVersions(a, b) {
  const pa = String(a || '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * A build number is authoritative when both sides have one; otherwise the
 * dotted version decides. Equal or older remotes never trigger a prompt.
 */
export function isNewer(remote, local) {
  const remoteBuild = Number(remote?.buildNumber) || 0;
  const localBuild = Number(local?.buildNumber) || 0;
  if (remoteBuild > 0 && localBuild > 0) return remoteBuild > localBuild;
  return compareVersions(remote?.version, local?.version) > 0;
}

/** Only http(s) download targets are allowed into the banner. */
export function safeDownloadUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.href;
  } catch (e) {
    return null;
  }
}
