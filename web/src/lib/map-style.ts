import type { StyleSpecification } from "maplibre-gl";

type MapTheme = "light" | "dark";

export function createBaseMapStyle(theme: MapTheme = "light"): StyleSpecification {
  const tiles =
    theme === "dark"
      ? ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"]
      : ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];

  const attribution =
    theme === "dark"
      ? "&copy; OpenStreetMap Contributors &copy; CARTO"
      : "&copy; OpenStreetMap Contributors";

  return {
    version: 8,
    projection: {
      type: "mercator",
    },
    sources: {
      openstreetmap: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution,
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