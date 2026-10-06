import type { Bounds } from "./types";

export const TILE_SIZE = 256;
const WORLD_RADIANS = 2 * Math.PI; // world width in your Mercator units

export interface Viewport {
    width: number;       // CSS pixels
    height: number;
    scale: number;       // screen pixels per world unit
    translateX: number;  // screen = world * scale + translate (y is flipped)
    translateY: number;
}

export const scaleFromZoom = (zoom: number) => (TILE_SIZE * 2 ** zoom) / WORLD_RADIANS;
export const zoomFromScale = (scale: number) => Math.log2((scale * WORLD_RADIANS) / TILE_SIZE);

export function createViewport(width: number, height: number, zoom: number): Viewport {
    return { width, height, scale: scaleFromZoom(zoom), translateX: width / 2, translateY: height / 2 };
}

/** Keeps the centre of the view fixed when the canvas changes size. */
export function resizeViewport(view: Viewport, width: number, height: number): void {
    view.translateX += (width - view.width) / 2;
    view.translateY += (height - view.height) / 2;
    view.width = width;
    view.height = height;
}

export function panBy(view: Viewport, dx: number, dy: number): void {
    view.translateX += dx;
    view.translateY += dy;
}

/** Zooms by `factor` keeping the world point under (sx, sy) in place. */
export function zoomAt(view: Viewport, sx: number, sy: number, factor: number, minScale: number, maxScale: number): void {
    const next = Math.min(maxScale, Math.max(minScale, view.scale * factor));
    const ratio = next / view.scale;
    view.translateX = sx - (sx - view.translateX) * ratio;
    view.translateY = sy - (sy - view.translateY) * ratio;
    view.scale = next;
}

export function visibleBounds(view: Viewport): Bounds {
    return [
        [-view.translateX / view.scale, (view.translateY - view.height) / view.scale],
        [(view.width - view.translateX) / view.scale, view.translateY / view.scale],
    ];
}