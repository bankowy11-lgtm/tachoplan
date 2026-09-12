// RouteMap.tsx — prawdziwa interaktywna mapa (§32), zbudowana na Leaflet +
// kafelki OpenStreetMap (darmowe, bez klucza API). Pokazuje start/cel/punkty
// pośrednie i linię trasy — rzeczywistą geometrię z Mapbox, gdy jest
// dostępna, albo (jawnie oznaczoną, przerywaną) linię prostą między
// geokodowanymi punktami, gdy backend routingu nie jest skonfigurowany.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeocodedPlace, RoutePoint } from "../../types";

// Domyślne ikony Leaflet ładują się z plików obrazków przez URL-e wskazujące
// na node_modules — w Vite trzeba je podać jawnie jako importowane assety.
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const domyslnaIkona = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function kolorowaIkona(kolor: string, znak: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:${kolor};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)">${znak}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export interface RouteMapPoint {
  place: GeocodedPlace;
  rola: "start" | "waypoint" | "cel";
}

export default function RouteMap({
  points,
  geometry,
  geometryIsReal,
}: {
  points: RouteMapPoint[];
  /** Rzeczywista geometria trasy (z Mapbox) — jeśli brak, rysujemy linię prostą. */
  geometry?: RoutePoint[];
  /** Czy `geometry` to prawdziwy przebieg drogi (true) czy linia prosta (false). */
  geometryIsReal?: boolean;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    mapRef.current = L.map(divRef.current, { attributionControl: true }).setView([52.0, 15.0], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layer = L.layerGroup().addTo(map);
    const latLngs: L.LatLngExpression[] = [];

    points.forEach((p) => {
      const kolor = p.rola === "start" ? "#22c55e" : p.rola === "cel" ? "#ef4444" : "#2f7bf6";
      const znak = p.rola === "start" ? "🏁" : p.rola === "cel" ? "🏁" : "📍";
      const icon = kolorowaIkona(kolor, znak) ?? domyslnaIkona;
      L.marker([p.place.lat, p.place.lon], { icon })
        .addTo(layer)
        .bindPopup(`${p.place.displayName}${p.place.country ? ` — ${p.place.country}` : ""}`);
      latLngs.push([p.place.lat, p.place.lon]);
    });

    if (geometry && geometry.length > 1) {
      const line = geometry.map((pt) => [pt.lat, pt.lon] as L.LatLngExpression);
      L.polyline(line, {
        color: geometryIsReal ? "#2f7bf6" : "#93a0b8",
        weight: 4,
        dashArray: geometryIsReal ? undefined : "8 8",
      }).addTo(layer);
    } else if (latLngs.length > 1) {
      L.polyline(latLngs, { color: "#93a0b8", weight: 3, dashArray: "8 8" }).addTo(layer);
    }

    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30], maxZoom: 12 });
    }

    return () => {
      layer.remove();
    };
  }, [points, geometry, geometryIsReal]);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={divRef}
        style={{
          width: "100%",
          height: 260,
          borderRadius: "var(--radius)",
          overflow: "hidden",
          border: "1px solid var(--card-border)",
        }}
      />
      {geometry && !geometryIsReal && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            background: "rgba(10,15,28,0.85)",
            color: "var(--text-dim)",
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 8,
            zIndex: 1000,
          }}
        >
          ⚠️ linia prosta — trasa orientacyjna (brak danych routingu)
        </div>
      )}
    </div>
  );
}
