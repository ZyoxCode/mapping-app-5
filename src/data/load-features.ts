import shp from "shpjs";
import type { Feature } from "../layers/features";
import { pathExists, toAbsoluteUrl } from "../core/files";

const cache = new Map<string, Feature[]>();

async function findFirstExisting(urls: string[]): Promise<string | null> {
    for (const url of urls) {
        if (await pathExists(url)) return url;
    }
    return null;
}

export async function loadFeatures(name: string): Promise<Feature[]> {
    const cached = cache.get(name);
    if (cached) return cached;

    let data: any;

    // 1. GeoJSON
    const jsonUrl = await findFirstExisting(
        ["json", "geojson"].map(ext => toAbsoluteUrl(`./data/${name}/${name}.${ext}`))
    );

    if (jsonUrl) {
        data = await (await fetch(jsonUrl)).json();
    } else if (await pathExists(toAbsoluteUrl(`./data/${name}/${name}.shp`))) {
        // 2. Unzipped shapefile (shpjs takes the path without the extension)
        data = await shp(toAbsoluteUrl(`./data/${name}/${name}`));
    } else if (await pathExists(toAbsoluteUrl(`./data/${name}.zip`))) {
        // 3. Zipped shapefile
        data = await shp(toAbsoluteUrl(`./data/${name}.zip`));
    } else {
        throw new Error(`No GeoJSON, shapefile or zip found for "${name}"`);
    }

    // shpjs returns an array when a zip contains several layers
    const collection = Array.isArray(data) ? data[0] : data;
    const features = collection.features as Feature[];

    cache.set(name, features);
    return features;
}