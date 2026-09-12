// googleMapsService.ts
// ---------------------------------------------------------------------------
// Przygotowanie architektury pod Google Maps Directions API jako alternatywny
// dostawca trasy (§1, §4) — na razie NIE zaimplementowane (nie ma jeszcze
// backendu proxy dla Google). Interfejs jest identyczny z `mapboxService.ts`,
// żeby `App`/ekrany mogły przełączać dostawcę bez zmian w UI, gdy tylko
// powstanie `api/directions-google.ts` (analogicznie do `api/directions.ts`).

import type { RouteResult } from "../types";

export interface GoogleDirectionsRequest {
  coordinates: { lat: number; lon: number }[];
  alternatives?: boolean;
}

export type GoogleDirectionsResponse =
  | { available: true; result: RouteResult }
  | { available: false; reason: string };

export async function getDirections(_req: GoogleDirectionsRequest): Promise<GoogleDirectionsResponse> {
  return {
    available: false,
    reason:
      "Dostawca Google Maps nie jest jeszcze podłączony w tej wersji (architektura przygotowana — patrz komentarz w tym pliku). Użyj Mapbox lub wpisz czas jazdy ręcznie.",
  };
}
