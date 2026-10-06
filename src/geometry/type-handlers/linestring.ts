import type { Position, ZoomLevel } from "../../core/types";
import { computeCoordsBounds, lonLatToMercator } from "../../math";
import { registerGeometry } from "../registry";
import { buildRing, RingSimplifier } from "../simplification";
import type { BuiltSimple, PreparedSimple } from "../types";
import { removeDuplicateEnds } from "../utils";

export type PreparedLineString = PreparedSimple["LineString"];
export type BuiltLineString = BuiltSimple["LineString"];

export function prepareLineString(coordinates: Position[], zoomLevels: ZoomLevel[]): PreparedLineString {
    const bbox = computeCoordsBounds(coordinates);
    const simplifier = new RingSimplifier(buildRing(removeDuplicateEnds(coordinates), true), true)

    const coordinatesPerZoomLevel: Position[][] = [];
    for (const zoomLevel of zoomLevels) {

        if (zoomLevel.areaThreshold != 0) simplifier.simplify(zoomLevel.areaThreshold);
        coordinatesPerZoomLevel.push(coordinates.map(position => lonLatToMercator(position)))

    }

    return { type: "LineString", bbox, coordinatesPerZoomLevel };
}

export function buildLineString(prepared: PreparedLineString): BuiltLineString {
    const pathPerZoomLevel: Path2D[] = [];
    prepared.coordinatesPerZoomLevel.forEach((pts, _) => {
        const path = new Path2D();
        if (pts.length >= 2) {
            path.moveTo(pts[0][0], pts[0][1]);
            for (let i = 2; i < pts.length; i += 2) path.lineTo(pts[i][0], pts[i][1]);
        }
        pathPerZoomLevel.push(path);
    });
    return { type: "LineString", bbox: prepared.bbox, pathPerZoomLevel };
}

registerGeometry("LineString", {
    prepare: (geometry, zoomLevels) => prepareLineString(geometry.coordinates, zoomLevels),
    build: buildLineString
});