export type Position = [number, number];   // [lon, lat]
export type Bounds = [Position, Position];  // [[minX, minY], [maxX, maxY]]


export interface CoordinatesByType {
    LineString: Position[];
    MultiLineString: Position[][];
    Polygon: Position[][];
    MultiPolygon: Position[][][];
}

export interface ZoomLevel {
    upperZoomBound: number;
    areaThreshold: number;
}