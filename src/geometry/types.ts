import type { Bounds, CoordinatesByType } from "../core/types";

export type GeometryType = keyof CoordinatesByType;
export type SimpleType = "LineString" | "Polygon";
export type MultiType = "MultiLineString" | "MultiPolygon";

// which simple type each multi type is made of
interface PartTypeOf {
    MultiLineString: "LineString";
    MultiPolygon: "Polygon";
}

export type Geometry = {
    [K in GeometryType]: { type: K; coordinates: CoordinatesByType[K] };
}[GeometryType];

// PREPARED
export type PreparedSimple = {
    [K in SimpleType]: {
        type: K;
        bbox: Bounds;
        coordinatesPerZoomLevel: CoordinatesByType[K][];
    };
};

export type PreparedMulti = {
    [K in MultiType]: {
        type: K;
        parts: PreparedSimple[PartTypeOf[K]][];
    };
};

export type PreparedGeometry = PreparedSimple[SimpleType] | PreparedMulti[MultiType];

// BUILT
export type BuiltSimple = {
    [K in SimpleType]: {
        type: K;
        bbox: Bounds;
        pathPerZoomLevel: Path2D[];
    };
};

export type BuiltMulti = {
    [K in MultiType]: {
        type: K;
        parts: BuiltSimple[PartTypeOf[K]][];
    };
};

export type BuiltGeometry = BuiltSimple[SimpleType] | BuiltMulti[MultiType];