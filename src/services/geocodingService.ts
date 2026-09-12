// geocodingService.ts
// ---------------------------------------------------------------------------
// Geokodowanie nazw miejsc (miasto/adres → współrzędne + kraj) przez Nominatim
// (OpenStreetMap) — publiczne, bezpłatne API, NIE wymaga klucza. To jest
// prawdziwa integracja sieciowa (nie mock): rzeczywiste zapytanie HTTP,
// rzeczywisty wynik, z jawną obsługą błędu/braku wyniku (§43).
//
// Zasady użycia Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
// - maks. 1 zapytanie/s, dlatego kolejkujemy zapytania (`kolejkuj`),
// - wynik jest cache'owany w localStorage, żeby nie pytać dwa razy o to samo,
// - wymagany jest podpis aplikacji — przeglądarka nie pozwala nadpisać
//   User-Agent, ale wysyła nagłówek Referer, co Nominatim akceptuje dla
//   ruchu z przeglądarki na niewielką skalę (użycie osobiste w tej appce).
//
// Przy większej skali (wielu użytkowników) należy przenieść te zapytania za
// własny backend/serverless (tak jak `mapboxService.ts`) i/lub skorzystać z
// płatnego planu Nominatim / innego dostawcy geokodowania.

import type { GeocodedPlace } from "../types";

const CACHE_KEY = "tachoplan.geocode.cache.v1";
const CACHE_MAX_ENTRIES = 300;

interface CacheEntry {
  place: GeocodedPlace | null;
  cachedAtIso: string;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  try {
    const keys = Object.keys(cache);
    if (keys.length > CACHE_MAX_ENTRIES) {
      // usuń najstarsze wpisy, żeby cache nie rosło bez końca
      keys
        .sort((a, b) => cache[a].cachedAtIso.localeCompare(cache[b].cachedAtIso))
        .slice(0, keys.length - CACHE_MAX_ENTRIES)
        .forEach((k) => delete cache[k]);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage niedostępny (np. tryb prywatny) — po prostu bez cache
  }
}

// Prosta kolejka zapewniająca odstęp min. 1100 ms między realnymi zapytaniami
// sieciowymi do Nominatim (wpisy z cache nie przechodzą przez kolejkę).
let ostatnieZapytanieMs = 0;
let kolejka: Promise<void> = Promise.resolve();

function kolejkuj<T>(fn: () => Promise<T>): Promise<T> {
  const wynik = kolejka.then(async () => {
    const teraz = Date.now();
    const czekaj = Math.max(0, ostatnieZapytanieMs + 1100 - teraz);
    if (czekaj > 0) await new Promise((r) => setTimeout(r, czekaj));
    ostatnieZapytanieMs = Date.now();
    return fn();
  });
  kolejka = wynik.then(
    () => undefined,
    () => undefined
  );
  return wynik;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

/** Geokoduje nazwę miejsca na współrzędne + kraj. Zwraca `null`, gdy nie
 *  znaleziono (nigdy nie zwraca fikcyjnych danych). */
export async function geocode(query: string): Promise<GeocodedPlace | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cache = loadCache();
  const cacheKey = trimmed.toLowerCase();
  const hit = cache[cacheKey];
  if (hit) return hit.place;

  try {
    const place = await kolejkuj(async () => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", trimmed);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "1");
      const resp = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
      const results = (await resp.json()) as NominatimResult[];
      if (!results.length) return null;
      const r = results[0];
      const p: GeocodedPlace = {
        query: trimmed,
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        countryCode: r.address?.country_code ?? "",
        country: r.address?.country ?? "",
        city: r.address?.city ?? r.address?.town ?? r.address?.village,
      };
      return p;
    });

    cache[cacheKey] = { place, cachedAtIso: new Date().toISOString() };
    saveCache(cache);
    return place;
  } catch (err) {
    console.warn("[geocodingService] geocode() nieudane dla:", trimmed, err);
    return null;
  }
}

/** Geokoduje listę nazw miejsc po kolei (respektując limit 1 zapytanie/s). */
export async function geocodeMany(queries: string[]): Promise<(GeocodedPlace | null)[]> {
  const out: (GeocodedPlace | null)[] = [];
  for (const q of queries) {
    out.push(await geocode(q));
  }
  return out;
}

/** Odległość po linii prostej (haversine, km) — używana jako orientacyjny
 *  fallback, gdy nie jest dostępna prawdziwa trasa z Mapbox/Google Maps.
 *  NIGDY nie jest prezentowana jako rzeczywisty przebieg drogi bez jasnej
 *  etykiety "linia prosta" w UI (§43). */
export function odlegloscHaversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
