import type { Position, ZoomLevel } from "../../core/types";
import { registerGeometry } from "../registry";
import type { BuiltMulti, PreparedMulti } from "../types";
import { buildLineString, prepareLineString } from "./linestring";

export type PreparedMultiLineString = PreparedMulti["MultiLineString"];
export type BuiltMultiLineString = BuiltMulti["MultiLineString"];

export function prepareMultiLineString(coordinates: Position[][], zoomLevels: ZoomLevel[]): PreparedMultiLineString {
    return { type: "MultiLineString", parts: coordinates.map(poly => prepareLineString(poly, zoomLevels)) };
}

export function buildMultiLineString(prepared: PreparedMultiLineString): BuiltMultiLineString {
    return { type: "MultiLineString", parts: prepared.parts.map(part => buildLineString(part)) };
}

registerGeometry("MultiLineString", {
    prepare: (geometry, zoomLevels) => prepareMultiLineString(geometry.coordinates, zoomLevels),
    build: buildMultiLineString,
});