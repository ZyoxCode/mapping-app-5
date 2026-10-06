import type { ZoomLevel, Bounds } from "../../core/types";
import { loadFeatures } from "../../data/load-features";
import { buildGeometry, prepareGeometry } from "../../geometry";
import { appendToPath } from "../../geometry/utils";
import { resolveStyle, type Style } from "../../styles/stylerule";
import type { BuiltFeature, Feature } from "../features";
import { type LayerOptions, Layer } from "../layer";



export interface GeometryLayerOptions extends LayerOptions {
    zoomLevels?: ZoomLevel[];
}

export function zoomLevelIndex(webMercZoom: number, levels: ZoomLevel[]): number {
    const index = levels.findLastIndex(level => webMercZoom <= level.upperZoomBound);
    return index === -1 ? levels.length - 1 : index;
}

const DEFAULT_ZOOM_LEVELS: ZoomLevel[] = [
    { upperZoomBound: Infinity, areaThreshold: 0 },
    { upperZoomBound: 3, areaThreshold: 1 },


];

export abstract class GeometryLayer extends Layer {
    protected features: BuiltFeature[] = [];
    protected zoomLevels: ZoomLevel[];

    constructor(options: GeometryLayerOptions) {
        super(options);
        this.zoomLevels = options.zoomLevels ?? DEFAULT_ZOOM_LEVELS;
    }

    protected abstract loadFeatures(): Promise<Feature[]>;

    async load(): Promise<void> {
        const raw = await this.loadFeatures();
        this.features = raw.flatMap(f => {
            if (f.geometry == null) return [];

            const prepared = prepareGeometry(f.geometry, this.zoomLevels);
            if (prepared == null) return [];

            return [{ ...f, geometry: buildGeometry(prepared) }];
        })
        this.ready = true;
    }

    render(ctx: CanvasRenderingContext2D, visibleBounds: Bounds, scale: number, webMercScale: number): void {
        const buckets = new Map<Style, Path2D>();

        const zoomIndex = zoomLevelIndex(webMercScale, this.zoomLevels);

        for (const feature of this.features) {

            if (feature.properties.MIN_ZOOM >= webMercScale) continue;
            const geometry = feature.geometry;

            if (geometry && this.geometryStyle) {
                const style = resolveStyle(this.geometryStyle, feature.properties, webMercScale);
                if (style) {
                    let path = buckets.get(style);

                    if (!path) {
                        path = new Path2D();
                        buckets.set(style, path);
                    }

                    if (style.enabled.fill || style.enabled.stroke) {
                        appendToPath(path, geometry, visibleBounds, zoomIndex);
                    }
                };
            }

        }

        if (!this.ready) return;


        for (const [style, path] of buckets) {
            style.apply(ctx, scale);
            if (style.enabled.stroke) ctx.stroke(path);
            if (style.enabled.fill) ctx.fill(path, 'evenodd');
        }
    }
}

export class FileLayer extends GeometryLayer {
    private path: string;
    constructor(options: GeometryLayerOptions & { path: string }) {
        super(options);
        this.path = options.path;
    }

    protected async loadFeatures(): Promise<Feature[]> {
        return (await loadFeatures(this.path));
    }
}

export class StaticLayer extends GeometryLayer {
    constructor(options: GeometryLayerOptions & { features: Feature[] }) {
        super(options);
        this.rawFeatures = options.features;
    }
    private rawFeatures: Feature[];

    protected async loadFeatures(): Promise<Feature[]> {
        return this.rawFeatures;
    }
}