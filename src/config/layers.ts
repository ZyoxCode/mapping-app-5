import { FileLayer, StaticLayer } from "../layers/layer-types/geometry-layers";
import type { Layer } from "../layers/layer";
import { always, Style } from "../styles/stylerule";

export const COLORS = {
    'water': '#4f86aa',
    'land': '#92c592',
    'ice': '#f1f1f1'
}

export function createLayers(): Layer[] {
    return [
        new StaticLayer({
            name: "ocean",
            features: [
                {
                    geometry: {
                        type: "Polygon",
                        coordinates: [[[-180, -90], [-180, 90], [180, 90], [180, -90]]]
                    },
                    properties: {},
                }
            ],
            geometryStyle: always(new Style({
                fillColor: COLORS.water,
            }))
        }),
        new FileLayer({
            name: "land",
            path: "ne_10m_land",
            geometryStyle: always(new Style({
                fillColor: COLORS.land,
            }))
        }),
        //new FileLayer({ name: "countries", path: "ne_50m_admin_0_countries" }),
    ];
}