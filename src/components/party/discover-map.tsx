"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { PartyCard } from "@/lib/types";
import { createBaseMapStyle } from "@/lib/map-style";

type Props = {
  parties: PartyCard[];
};

const KUCKUCK_RED = "#b00000";
const CLUBHAUS_BLUE = "#1d4ed8";
const SCHLACHTHAUS_BROWN = "#7c2d12";

export function DiscoverMap({ parties }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: createBaseMapStyle(),
      center: [9.0599431, 48.5413588],
      zoom: 12,
    });

    parties.forEach((party) => {
      if (party.public_lng && party.public_lat) {
        const popup = new maplibregl.Popup({ offset: 16 });

        if (party.is_external) {
          const isClubhaus = party.vibe_label.toLowerCase().includes("clubhaus");
          const isKuckuck = party.vibe_label.toLowerCase().includes("kuckuck");
          const isSchlachthaus = party.vibe_label.toLowerCase().includes("schlachthaus");
          const popupNode = document.createElement("div");
          popupNode.className = "space-y-1";
          const titleNode = document.createElement("p");
          titleNode.className = "text-sm font-semibold";
          titleNode.textContent = party.title;
          if (isKuckuck) {
            titleNode.style.color = KUCKUCK_RED;
          } else if (isClubhaus) {
            titleNode.style.color = CLUBHAUS_BLUE;
          } else if (isSchlachthaus) {
            titleNode.style.color = SCHLACHTHAUS_BROWN;
          }
          const infoNode = document.createElement("p");
          infoNode.className = "text-xs text-zinc-600";
          if (isClubhaus) {
            infoNode.textContent = "Clubhaus · Wilhelmstraße 30, 72074 Tübingen";
            infoNode.style.color = CLUBHAUS_BLUE;
            popupNode.appendChild(titleNode);
            popupNode.appendChild(infoNode);
          } else {
            popupNode.appendChild(titleNode);
          }
          popup.setDOMContent(popupNode);

          const kuckuckMarker = document.createElement("div");
          kuckuckMarker.className =
            "grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-zinc-900 text-xs font-bold text-white";
          kuckuckMarker.textContent = isClubhaus ? "C" : isSchlachthaus ? "S" : "K";
          if (isKuckuck) {
            kuckuckMarker.style.backgroundColor = KUCKUCK_RED;
          } else if (isClubhaus) {
            kuckuckMarker.style.backgroundColor = CLUBHAUS_BLUE;
          } else if (isSchlachthaus) {
            kuckuckMarker.style.backgroundColor = SCHLACHTHAUS_BROWN;
          }

          new maplibregl.Marker({ element: kuckuckMarker })
            .setLngLat([party.public_lng, party.public_lat])
            .setPopup(popup)
            .addTo(map);

          return;
        }

        new maplibregl.Marker({ color: "#18181b" })
          .setLngLat([party.public_lng, party.public_lat])
          .setPopup(popup.setText(party.title))
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [parties]);

  return <div ref={mapRef} className="h-56 w-full overflow-hidden rounded-2xl border border-zinc-200" />;
}
