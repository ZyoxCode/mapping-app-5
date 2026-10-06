import type { Position, ZoomLevel } from "../../core/types";
import { registerGeometry } from "../registry";
import type { BuiltMulti, PreparedMulti } from "../types";
import { buildPolygon, preparePolygon } from "./polygon";

export type PreparedMultiPolygon = PreparedMulti["MultiPolygon"];
export type BuiltMultiPolygon = BuiltMulti["MultiPolygon"];

export function prepareMultiPolygon(coordinates: Position[][][], zoomLevels: ZoomLevel[]): PreparedMultiPolygon {
    return { type: "MultiPolygon", parts: coordinates.map(poly => preparePolygon(poly, zoomLevels)) };
}

export function buildMultiPolygon(prepared: PreparedMultiPolygon): BuiltMultiPolygon {
    return { type: "MultiPolygon", parts: prepared.parts.map(part => buildPolygon(part)) };
}

registerGeometry("MultiPolygon", {
    prepare: (geometry, zoomLevels) => prepareMultiPolygon(geometry.coordinates, zoomLevels),
    build: buildMultiPolygon,
});