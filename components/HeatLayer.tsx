"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type Props = {
  points: [number, number, number][]; // lat, lng, peso 0..1
  radius?: number;
  blur?: number;
  maxZoom?: number;
};

export function HeatLayer({ points, radius = 25, blur = 15, maxZoom = 17 }: Props) {
  const map = useMap();

  useEffect(() => {
    // @ts-expect-error leaflet.heat agrega L.heatLayer pero no tiene tipos
    const layer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom,
      minOpacity: 0.35,
      gradient: { 0.2: "#3b82f6", 0.4: "#10b981", 0.6: "#f59e0b", 0.8: "#ef4444" },
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, radius, blur, maxZoom]);

  return null;
}
