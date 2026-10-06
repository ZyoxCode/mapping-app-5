import { INITIAL_ZOOM } from "../config/defaults";
import { createViewport, resizeViewport, visibleBounds, zoomFromScale, type Viewport } from "../core/viewport";
import { attachPanZoom } from "../input/pan-zoom";
import type { Layer } from "../layers/layer";

export class GeoMap {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly view: Viewport;
    private readonly cleanups: Array<() => void> = [];
    private dirty = true;
    private frameId = 0;
    private canvas: HTMLCanvasElement;
    private layers: Layer[];

    constructor(canvas: HTMLCanvasElement, layers: Layer[]) {
        this.canvas = canvas;
        this.layers = layers;
        this.ctx = canvas.getContext("2d")!;
        this.view = createViewport(canvas.clientWidth, canvas.clientHeight, INITIAL_ZOOM);
    }

    invalidate(): void {
        this.dirty = true;
    }

    async start(): Promise<void> {
        this.syncCanvasSize();

        this.cleanups.push(attachPanZoom(this.canvas, this.view, () => this.invalidate()));

        const observer = new ResizeObserver(() => {
            this.syncCanvasSize();
            this.invalidate();
        });
        observer.observe(this.canvas);
        this.cleanups.push(() => observer.disconnect());

        this.frameId = requestAnimationFrame(this.frame);

        for (const layer of this.layers) layer.onChange = () => this.invalidate();
        // Layers appear as they finish loading; one failing doesn't stop the rest
        await Promise.allSettled(this.layers.map(async layer => {
            try {
                await layer.load(this.ctx);
            } catch (e) {
                console.error(`[${layer.name}] failed to load`, e);
            }
            this.invalidate();
        }));
    }

    destroy(): void {
        cancelAnimationFrame(this.frameId);
        this.cleanups.forEach(fn => fn());
    }

    private syncCanvasSize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        resizeViewport(this.view, w, h);
    }

    private frame = (): void => {
        if (this.dirty) {
            this.dirty = false;
            this.render();
        }
        this.frameId = requestAnimationFrame(this.frame);
    };

    private render(): void {
        const { ctx, view } = this;
        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const bounds = visibleBounds(view);
        const zoom = zoomFromScale(view.scale);

        for (const layer of this.layers) {
            if (!layer.ready) continue;
            ctx.save();
            // world units -> device pixels, with y flipped
            ctx.setTransform(dpr * view.scale, 0, 0, -dpr * view.scale, dpr * view.translateX, dpr * view.translateY);
            layer.render(ctx, bounds, view.scale, zoom);
            ctx.restore();
        }

        // labels go here later, drawn with ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
}