// mapboxService.ts
// ---------------------------------------------------------------------------
// Klient front-endowy do wyznaczania trasy (§4). NIGDY nie zawiera klucza API
// Mapbox — wysyła zapytanie do własnego serverless proxy (`/api/directions`,
// patrz `api/directions.ts`), który dopiero po stronie serwera dokłada
// prywatny token z `MAPBOX_TOKEN` i woła Mapbox Directions API.
//
// Architektura:
//   ten plik (front-end)
//     ↓ fetch("/api/directions")
//   api/directions.ts (backend / serverless function)
//     ↓ MAPBOX_TOKEN (tylko po stronie serwera)
//   Mapbox Directions API
//
// Gdy backend nie jest wdrożony (np. statyczny hosting bez funkcji
// serverless) albo `MAPBOX_TOKEN` nie jest skonfigurowany, funkcja zwraca
// `{ available: false }` — UI ma obowiązek to jasno pokazać i pozwolić na
// ręczne wprowadzenie czasu jazdy (§43), NIGDY nie pokazywać fikcyjnej trasy.

import type { RouteAlternative, RouteResult } from "../types";

export interface MapboxDirectionsRequest {
  /** Współrzędne w kolejności przejazdu: start, punkty pośrednie, cel. */
  coordinates: { lat: number; lon: number }[];
  alternatives?: boolean;
}

export type MapboxDirectionsResponse =
  | { available: true; result: RouteResult }
  | { available: false; reason: string };

/** Woła backend proxy `/api/directions`. Zwraca `available: false` z
 *  czytelnym powodem, gdy proxy nie odpowiada, nie jest wdrożony, albo
 *  serwer zgłosi brak skonfigurowanego tokenu Mapbox. */
export async function getDirections(req: MapboxDirectionsRequest): Promise<MapboxDirectionsResponse> {
  if (req.coordinates.length < 2) {
    return { available: false, reason: "Potrzeba przynajmniej dwóch punktów (start i cel)." };
  }

  try {
    const resp = await fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: req.coordinates.map((c) => [c.lon, c.lat]),
        alternatives: req.alternatives ?? true,
      }),
    });

    if (resp.status === 404) {
      return {
        available: false,
        reason:
          "Backend routingu (/api/directions) nie jest wdrożony w tym środowisku (np. statyczny hosting typu GitHub Pages). Wpisz czas jazdy ręcznie.",
      };
    }
    if (resp.status === 501) {
      return {
        available: false,
        reason: "Serwer nie ma skonfigurowanego klucza Mapbox (MAPBOX_TOKEN). Wpisz czas jazdy ręcznie.",
      };
    }
    if (!resp.ok) {
      return { available: false, reason: `Błąd serwera routingu (HTTP ${resp.status}). Wpisz czas jazdy ręcznie.` };
    }

    const data = (await resp.json()) as {
      alternatywy: { dystansKm: number; czasMin: number; geometry: [number, number][] }[];
      kraje: { kod: string; nazwa: string }[];
    };

    const alternatywy: RouteAlternative[] = data.alternatywy.map((a, i) => ({
      id: `mapbox-${i}`,
      etykieta: i === 0 ? "Najszybsza" : i === 1 ? "Alternatywna" : `Wariant ${i + 1}`,
      dystansKm: a.dystansKm,
      czasMin: a.czasMin,
      geometry: a.geometry.map(([lon, lat]) => ({ lat, lon })),
    }));

    const result: RouteResult = { provider: "mapbox", alternatywy, kraje: data.kraje };
    return { available: true, result };
  } catch (err) {
    console.warn("[mapboxService] getDirections() nieudane:", err);
    return {
      available: false,
      reason: "Brak połączenia z backendem routingu. Wpisz czas jazdy ręcznie.",
    };
  }
}
