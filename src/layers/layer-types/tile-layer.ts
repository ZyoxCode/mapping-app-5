import { VectorTile } from "@mapbox/vector-tile";
import Protobuf from "pbf";
import { PMTiles } from "pmtiles";
import type { Bounds } from "../core/types";
import { toAbsoluteUrl } from "../data/file-utils";
import { Layer, type LayerOptions } from "./layer";

const TWO_PI = 2 * Math.PI;

export interface TileLayerOptions extends LayerOptions {
    url: string;           // path to the .pmtiles file
    sourceLayer: string;   // layer name inside the tiles (the -l value, "land")
    fillStyle?: string;
    strokeStyle?: string;
    lineWidth?: number;    // screen pixels
    maxCachedTiles?: number;
}

interface TileData {
    fill: Path2D | null;
    stroke: Path2D | null;
}

const EMPTY: TileData = { fill: null, stroke: null };
const key = (z: number, x: number, y: number) => `${z}/${x}/${y}`;

export class TileLayer extends Layer {
    private readonly url: string;
    private readonly sourceLayer: string;
    private readonly fillStyle: string;
    private readonly strokeStyle: string;
    private readonly lineWidth: number;
    private readonly maxCachedTiles: number;

    private archive!: PMTiles;
    private minTileZoom = 0;
    private maxTileZoom = 0;
    private readonly tiles = new Map<string, TileData>(); // insertion order doubles as LRU order
    private readonly pending = new Set<string>();

    constructor(options: TileLayerOptions) {
        super(options);
        this.url = options.url;
        this.sourceLayer = options.sourceLayer;
        this.fillStyle = options.fillStyle ?? "#dddddd";
        this.strokeStyle = options.strokeStyle ?? "#555555";
        this.lineWidth = options.lineWidth ?? 1;
        this.maxCachedTiles = options.maxCachedTiles ?? 300;
    }

    async load(): Promise<void> {
        this.archive = new PMTiles(toAbsoluteUrl(this.url));
        const header = await this.archive.getHeader();
        this.minTileZoom = header.minZoom;
        this.maxTileZoom = header.maxZoom;
        this.ready = true;
    }

    render(ctx: CanvasRenderingContext2D, visibleBounds: Bounds, scale: number, zoom: number): void {
        // Above the tileset's max zoom we keep using its biggest tiles, stretched
        const z = Math.min(this.maxTileZoom, Math.max(this.minTileZoom, Math.floor(zoom)));
        const { x0, x1, y0, y1 } = tileRange(visibleBounds, z);

        const exact: TileData[] = [];
        const fallbacks = new Set<TileData>();

        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
                const tile = this.getTile(z, x, y);
                if (tile) exact.push(tile);
                else {
                    const ancestor = this.findAncestor(z, x, y);
                    if (ancestor) fallbacks.add(ancestor);
                }
            }
        }

        // Coarser tiles first, so tiles still loading show something instead of a gap
        for (const tile of fallbacks) this.draw(ctx, tile, scale);
        for (const tile of exact) this.draw(ctx, tile, scale);
    }

    private draw(ctx: CanvasRenderingContext2D, tile: TileData, scale: number): void {
        if (tile.fill) {
            ctx.fillStyle = this.fillStyle;
            ctx.fill(tile.fill, "evenodd");
        }
        if (tile.stroke) {
            ctx.strokeStyle = this.strokeStyle;
            ctx.lineWidth = this.lineWidth / scale; // world units -> constant screen width
            ctx.stroke(tile.stroke);
        }
    }

    /** Returns a cached tile, or starts loading it and returns undefined. */
    private getTile(z: number, x: number, y: number): TileData | undefined {
        const k = key(z, x, y);
        const cached = this.tiles.get(k);
        if (cached) {
            this.tiles.delete(k); // move to the end: most recently used
            this.tiles.set(k, cached);
            return cached;
        }
        if (!this.pending.has(k)) {
            this.pending.add(k);
            void this.fetchTile(z, x, y, k);
        }
        return undefined;
    }

    private findAncestor(z: number, x: number, y: number): TileData | undefined {
        for (let az = z - 1; az >= this.minTileZoom; az--) {
            const shift = z - az;
            const tile = this.tiles.get(key(az, x >> shift, y >> shift));
            if (tile) return tile;
        }
        return undefined;
    }

    private async fetchTile(z: number, x: number, y: number, k: string): Promise<void> {
        try {
            const res = await this.archive.getZxy(z, x, y);
            this.tiles.set(k, res ? this.decode(res.data, z, x, y) : EMPTY);
        } catch (e) {
            console.error(`[${this.name}] tile ${k} failed`, e);
            this.tiles.set(k, EMPTY); // don't retry on every frame
        } finally {
            this.pending.delete(k);
        }

        while (this.tiles.size > this.maxCachedTiles) {
            this.tiles.delete(this.tiles.keys().next().value!);
        }
        this.onChange();
    }

    private decode(buffer: ArrayBuffer, z: number, x: number, y: number): TileData {
        const layer = new VectorTile(new Protobuf(buffer)).layers[this.sourceLayer];
        if (!layer) return EMPTY;

        const n = 2 ** z;
        // tile coordinates -> your world units (Mercator, radians, y up)
        const worldX = (px: number) => ((x + px / layer.extent) / n) * TWO_PI - Math.PI;
        const worldY = (py: number) => Math.PI - ((y + py / layer.extent) / n) * TWO_PI;

        const fill = new Path2D();
        const stroke = new Path2D();
        let hasFill = false;
        let hasStroke = false;

        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i);
            if (feature.type !== 2 && feature.type !== 3) continue; // lines and polygons only

            for (const ring of feature.loadGeometry()) {
                if (ring.length < 2) continue;
                const path = feature.type === 3 ? fill : stroke;
                path.moveTo(worldX(ring[0].x), worldY(ring[0].y));
                for (let j = 1; j < ring.length; j++) path.lineTo(worldX(ring[j].x), worldY(ring[j].y));
                if (feature.type === 3) { path.closePath(); hasFill = true; }
                else hasStroke = true;
            }
        }

        return { fill: hasFill ? fill : null, stroke: hasStroke ? stroke : null };
    }
}

function tileRange(bounds: Bounds, z: number) {
    const n = 2 ** z;
    const clamp = (v: number) => Math.min(n - 1, Math.max(0, v));
    return {
        x0: clamp(Math.floor(((bounds[0][0] + Math.PI) / TWO_PI) * n)),
        x1: clamp(Math.floor(((bounds[1][0] + Math.PI) / TWO_PI) * n)),
        y0: clamp(Math.floor(((Math.PI - bounds[1][1]) / TWO_PI) * n)), // top edge = max world y
        y1: clamp(Math.floor(((Math.PI - bounds[0][1]) / TWO_PI) * n)),
    };
}