import type { StyleSpecification } from "maplibre-gl";

export function createBaseMapStyle(): StyleSpecification {
  return {
    version: 8,
    projection: {
      type: "mercator",
    },
    sources: {
      openstreetmap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap Contributors",
      },
    },
    layers: [
      {
        id: "osm-raster",
        type: "raster",
        source: "openstreetmap",
      },
    ],
  };
}