import type { CoordinatesByType, ZoomLevel } from "../core/types";
import type { BuiltGeometry, BuiltMulti, BuiltSimple, Geometry, GeometryType, PreparedGeometry, PreparedMulti, PreparedSimple } from "./types";

type GeometryByType = { [K in GeometryType]: { type: K; coordinates: CoordinatesByType[K] } };
type PreparedByType = PreparedSimple & PreparedMulti;
type BuiltByType = BuiltSimple & BuiltMulti;

export interface GeometryHandler<K extends GeometryType> {
    prepare(geometry: GeometryByType[K], zoomLevels: ZoomLevel[]): PreparedByType[K] | null;
    build(prepared: PreparedByType[K]): BuiltByType[K];
}

const registry = new Map<GeometryType, GeometryHandler<any>>();

export function registerGeometry<K extends GeometryType>(type: K, handler: GeometryHandler<K>): void {
    registry.set(type, handler);
}

export function getGeometryHandler<K extends GeometryType>(type: K): GeometryHandler<K> {
    const handler = registry.get(type);
    if (!handler) throw new Error(`No geometry handler registered for ${type}`);
    return handler as GeometryHandler<K>;
}

export function prepareGeometry(geometry: Geometry, zoomLevels: ZoomLevel[]): PreparedGeometry | null {
    const handler = getGeometryHandler(geometry.type);
    return handler.prepare(geometry, zoomLevels) ?? null
}

export function buildGeometry(prepared: PreparedGeometry): BuiltGeometry {
    const handler = getGeometryHandler(prepared.type);
    return handler.build(prepared);
}