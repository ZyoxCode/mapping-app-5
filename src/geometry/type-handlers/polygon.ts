import type { Position, ZoomLevel } from "../../core/types";
import { computeCoordsBounds, lonLatToMercator } from "../../math";
import { registerGeometry } from "../registry";
import { buildRing, RingSimplifier } from "../simplification";
import type { BuiltSimple, PreparedSimple } from "../types";
import { removeDuplicateEnds, ringArea } from "../utils";

export type PreparedPolygon = PreparedSimple["Polygon"];
export type BuiltPolygon = BuiltSimple["Polygon"];

export function preparePolygon(coordinates: Position[][], zoomLevels: ZoomLevel[]): PreparedPolygon {
    const bbox = computeCoordsBounds(coordinates[0]);

    let active = coordinates.map(ring =>
        new RingSimplifier(buildRing(removeDuplicateEnds(ring), true), true)
    );

    const coordinatesPerZoomLevel: Position[][][] = [];
    for (const zoomLevel of zoomLevels) {
        const snapshots = active.map(r => {
            if (zoomLevel.areaThreshold != 0) r.simplify(zoomLevel.areaThreshold);
            return r.snapshot();
        });

        // a ring is gone once it's a triangle smaller than the threshold
        const keep = snapshots.map(ring =>
            ring.length >= 3 && (ring.length > 3 || ringArea(ring) >= zoomLevel.areaThreshold)
        );

        // if the outer ring is gone, the whole polygon is gone from here on
        if (!keep[0]) {
            active = [];
            coordinatesPerZoomLevel.push([]);
            continue;
        }

        coordinatesPerZoomLevel.push(
            snapshots
                .filter((_, i) => keep[i])
                .map(ring => ring.map(position => lonLatToMercator(position)))
        );
        active = active.filter((_, i) => keep[i]);
    }

    return { type: "Polygon", bbox, coordinatesPerZoomLevel };
}

export function buildPolygon(prepared: PreparedPolygon): BuiltPolygon {
    const pathPerZoomLevel = prepared.coordinatesPerZoomLevel.map(rings => {
        const path = new Path2D();
        for (const ring of rings) {
            if (ring.length < 2) continue;
            path.moveTo(ring[0][0], ring[0][1]);
            for (let i = 1; i < ring.length; i++) path.lineTo(ring[i][0], ring[i][1]);
            path.closePath();
        }
        return path;
    });
    return { type: "Polygon", bbox: prepared.bbox, pathPerZoomLevel };
}

registerGeometry("Polygon", {
    prepare: (geometry, zoomLevels) => preparePolygon(geometry.coordinates, zoomLevels),
    build: buildPolygon,
});