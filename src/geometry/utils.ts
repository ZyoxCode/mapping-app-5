import type { Bounds, Position } from "../core/types";
import { boundsIntersect, lonLatToMercator, vectorLength, vectorSubtract } from "../math";
import type { BuiltGeometry } from "./types";

export function flatten(points: Position[]): Position[] {
    const out = []
    for (let i = 0; i < points.length; i++) {
        const [x, y] = lonLatToMercator(points[i]);
        out.push([x, y] as Position);
    }
    return out;
}

export function removeDuplicateEnds(ring: Position[], epsilon = 1e-5): Position[] {

    if (vectorLength(vectorSubtract(ring[ring.length - 1], ring[0])) < epsilon) {
        return ring.slice(0, -1);
    }

    return ring;
}

export function ringToPath(ring: Position[], close = false) {
    const path = new Path2D();
    ring.forEach(([lon, lat], i) => {
        const [x, y] = lonLatToMercator([lon, lat]);
        i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    });
    if (close) path.closePath();
    return path;
}

export function ringArea(ring: Position[]): number {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
        const [x0, y0] = ring[i];
        const [x1, y1] = ring[(i + 1) % ring.length];
        area += x0 * y1 - x1 * y0;
    }
    return Math.abs(area / 2);
}

export function appendToPath(merged: Path2D, built: BuiltGeometry, visible: Bounds, zoomIndex: number): void {
    if (built.type === "MultiPolygon" || built.type === "MultiLineString") {
        for (const part of built.parts) appendToPath(merged, part, visible, zoomIndex);
        return;
    }
    if (!boundsIntersect(built.bbox, visible)) return;
    const path = built.pathPerZoomLevel[zoomIndex];
    if (path) merged.addPath(path);
}