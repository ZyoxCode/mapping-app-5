import type { Bounds } from "../core/types";
import { type StyleRule } from "../styles/stylerule";
import { mergeWithDefaults } from "../utils/defaults";

export interface LayerOptions {
    name: string;
    geometryStyle?: StyleRule[] | null;
    debug?: boolean;
}

const DEFAULT_LAYER_OPTIONS: Required<LayerOptions> = {
    name: "unnamed",
    geometryStyle: null,
    debug: false,
}

export abstract class Layer {
    name: string;
    geometryStyle: StyleRule[] | null;
    debug: boolean;
    ready: boolean;
    onChange: () => void = () => { };

    constructor(options: LayerOptions) {
        const merged = mergeWithDefaults(options, DEFAULT_LAYER_OPTIONS);
        this.name = merged.name;
        this.geometryStyle = merged.geometryStyle;
        this.debug = merged.debug;
        this.ready = false;
    }

    abstract load(ctx: CanvasRenderingContext2D): Promise<void>;

    abstract render(
        ctx: CanvasRenderingContext2D,
        visibleBounds: Bounds,
        scale: number,
        webMercScale: number
    ): void;


}