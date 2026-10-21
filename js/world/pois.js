// ============================================================
// RUSTGAME — Phase 2.3: points of interest, compass and minimap
// The compass and the minimap are the same data seen two ways, so
// the geometry lives in one pure module and the DOM/canvas layer
// only draws what it is given.
// Pure module: no DOM, no THREE. Testable in Node.
// ============================================================

/** The points of interest in the world. The monuments are the landmarks. */
export const POIS = [
    { id: 'monument_west', name: 'West Monument', kind: 'monument', x: 40, z: -40 },
    { id: 'monument_east', name: 'East Monument', kind: 'monument', x: -60, z: 50 },
];

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/** Pixels per metre on the minimap. */
export const MINIMAP_SCALE = 1;

export function distanceTo(fromX, fromZ, poi) {
    const dx = poi.x - fromX;
    const dz = poi.z - fromZ;
    return Math.hypot(dx, dz);
}

/**
 * Bearing to a point, in radians, clockwise from north (-Z). 0 = north,
 * PI/2 = east.
 */
export function bearingTo(fromX, fromZ, poi) {
    return Math.atan2(poi.x - fromX, -(poi.z - fromZ));
}

/** The 8-point compass label for a bearing. */
export function compassLabel(bearingRad) {
    const norm = normalizeAngle(bearingRad);
    const index = Math.round((norm / (Math.PI * 2)) * 8) % 8;
    return COMPASS_POINTS[(index + 8) % 8];
}

/** The arrow for a bearing. */
export function arrowFor(bearingRad) {
    const norm = normalizeAngle(bearingRad);
    const index = Math.round((norm / (Math.PI * 2)) * 8) % 8;
    return ARROWS[(index + 8) % 8];
}

/** Wraps an angle into (-PI, PI]. */
export function normalizeAngle(rad) {
    if (typeof rad !== 'number' || !isFinite(rad)) return 0;
    let a = rad % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a <= -Math.PI) a += Math.PI * 2;
    return a;
}

/**
 * The angle between the player's facing and a point: 0 = straight ahead,
 * positive = to the right.
 */
export function relativeAngle(playerBearingRad, poiBearingRad) {
    return normalizeAngle(poiBearingRad - playerBearingRad);
}

/** The closest point of interest, or null when there is none. */
export function nearestPoi(fromX, fromZ, pois = POIS) {
    let best = null;
    let bestDistance = Infinity;
    for (const poi of pois) {
        const d = distanceTo(fromX, fromZ, poi);
        if (d < bestDistance) {
            bestDistance = d;
            best = poi;
        }
    }
    if (!best) return null;
    return { poi: best, distance: bestDistance };
}

/**
 * Where each point of interest sits on the minimap, in pixels relative to
 * the player (who is always in the middle). The map is rotated so the
 * player's facing points up.
 */
export function minimapLayout(playerX, playerZ, playerBearingRad, pois = POIS, scale = MINIMAP_SCALE) {
    const out = [];
    for (const poi of pois) {
        const dx = (poi.x - playerX);
        const dz = (poi.z - playerZ);
        const distance = Math.hypot(dx, dz);
        // Rotate the world so the player's facing points up (-Y on the canvas):
        // a point straight ahead lands above the player, one to the right lands
        // to the right.
        const rel = normalizeAngle(Math.atan2(dx, -dz) - playerBearingRad);
        out.push({
            id: poi.id,
            name: poi.name,
            kind: poi.kind,
            distance: distance * scale,
            x: distance * scale * Math.sin(rel),
            y: -distance * scale * Math.cos(rel),
        });
    }
    return out;
}

/** The compass readout for the nearest point of interest. */
export function compassReadout(playerX, playerZ, playerBearingRad, pois = POIS) {
    const nearest = nearestPoi(playerX, playerZ, pois);
    if (!nearest) return null;
    const bearing = bearingTo(playerX, playerZ, nearest.poi);
    const relative = relativeAngle(playerBearingRad, bearing);
    return {
        name: nearest.poi.name,
        distance: nearest.distance,
        bearing,
        label: compassLabel(relative),
        arrow: arrowFor(relative),
        relative,
    };
}
