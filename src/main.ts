import { GeoMap } from "./app/geo-map";
import { createLayers } from "./config/layers";

const canvas = document.querySelector<HTMLCanvasElement>("#map")!;
await new GeoMap(canvas, createLayers()).start();