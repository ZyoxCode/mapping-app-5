import type { BuiltGeometry, Geometry, PreparedGeometry } from "../geometry/types";

export interface Feature<G = Geometry, P = Record<string, any>> {
    geometry: G;
    properties: P;
}

export type PreparedFeature<P = Record<string, any>> = Feature<PreparedGeometry, P>;

export type BuiltFeature<P = Record<string, any>> = Feature<BuiltGeometry, P>;
