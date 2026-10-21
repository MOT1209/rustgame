import { describe, it, expect } from 'vitest';
import {
    POIS,
    arrowFor,
    bearingTo,
    compassLabel,
    compassReadout,
    distanceTo,
    minimapLayout,
    nearestPoi,
    normalizeAngle,
    relativeAngle,
} from '../js/world/pois.js';

const monument = { id: 'm', name: 'M', kind: 'monument', x: 0, z: -10 };

describe('bearing and distance', () => {
    it('measures the distance to a point', () => {
        expect(distanceTo(0, 0, monument)).toBe(10);
        expect(distanceTo(3, 4, { x: 0, z: 0 })).toBe(5);
    });

    it('bearings run clockwise from north', () => {
        expect(bearingTo(0, 0, { x: 0, z: -10 })).toBeCloseTo(0, 5);        // north
        expect(bearingTo(0, 0, { x: 10, z: 0 })).toBeCloseTo(Math.PI / 2, 5); // east
        expect(bearingTo(0, 0, { x: 0, z: 10 })).toBeCloseTo(Math.PI, 5);     // south
        expect(bearingTo(0, 0, { x: -10, z: 0 })).toBeCloseTo(-Math.PI / 2, 5); // west
    });
});

describe('compass labels', () => {
    it('names the eight directions', () => {
        expect(compassLabel(0)).toBe('N');
        expect(compassLabel(Math.PI / 2)).toBe('E');
        expect(compassLabel(Math.PI)).toBe('S');
        expect(compassLabel(-Math.PI / 2)).toBe('W');
        expect(compassLabel(Math.PI / 4)).toBe('NE');
    });

    it('has an arrow for every direction', () => {
        expect(arrowFor(0)).toBe('↑');
        expect(arrowFor(Math.PI / 2)).toBe('→');
        expect(arrowFor(Math.PI)).toBe('↓');
        expect(arrowFor(-Math.PI / 2)).toBe('←');
    });

    it('wraps angles into (-PI, PI]', () => {
        expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5);
        expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(Math.PI, 5);
        expect(normalizeAngle(0)).toBe(0);
        expect(normalizeAngle(NaN)).toBe(0);
    });
});

describe('relativeAngle', () => {
    it('is zero when the point is straight ahead', () => {
        expect(relativeAngle(0, 0)).toBe(0);
    });

    it('is positive to the right and negative to the left', () => {
        expect(relativeAngle(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
        expect(relativeAngle(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 5);
    });
});

describe('nearestPoi', () => {
    it('picks the closest point of interest', () => {
        const pois = [
            { id: 'far', name: 'Far', kind: 'monument', x: 100, z: 0 },
            { id: 'near', name: 'Near', kind: 'monument', x: 5, z: 0 },
        ];
        const nearest = nearestPoi(0, 0, pois);
        expect(nearest.poi.id).toBe('near');
        expect(nearest.distance).toBe(5);
    });

    it('returns null when there is nothing to find', () => {
        expect(nearestPoi(0, 0, [])).toBe(null);
    });

    it('the world has monuments to find', () => {
        expect(POIS.length).toBeGreaterThan(0);
        expect(nearestPoi(0, 0, POIS)).not.toBe(null);
    });
});

describe('minimapLayout', () => {
    it('puts the player in the middle and the points around them', () => {
        const points = minimapLayout(0, 0, 0, [monument]);
        expect(points).toHaveLength(1);
        expect(points[0].distance).toBe(10);
        // The monument is 10 m north → straight up on the map.
        expect(points[0].x).toBeCloseTo(0, 5);
        expect(points[0].y).toBeCloseTo(-10, 5);
    });

    it('rotates the map so the player always faces up', () => {
        const points = minimapLayout(0, 0, Math.PI / 2, [{ id: 'e', name: 'E', kind: 'monument', x: 10, z: 0 }]);
        // Facing east → the east monument is straight up.
        expect(points[0].x).toBeCloseTo(0, 5);
        expect(points[0].y).toBeCloseTo(-10, 5);
    });
});

describe('compassReadout', () => {
    it('points at the nearest point of interest', () => {
        const readout = compassReadout(0, 0, 0, [monument]);
        expect(readout.name).toBe('M');
        expect(readout.label).toBe('N');
        expect(readout.arrow).toBe('↑');
        expect(readout.distance).toBe(10);
    });

    it('is null without any point of interest', () => {
        expect(compassReadout(0, 0, 0, [])).toBe(null);
    });
});
