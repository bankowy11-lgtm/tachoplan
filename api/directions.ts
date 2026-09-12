// api/directions.ts
// ---------------------------------------------------------------------------
// Serverless function (format zgodny z Vercel — plik w /api trafia
// automatycznie pod /api/directions). Jedyne miejsce w całym projekcie, w
// którym używany jest prywatny token Mapbox — czytany z env po stronie
// serwera (`process.env.MAPBOX_TOKEN`), NIGDY z kodu front-endowego (§36).
//
// Wdrożenie:
//  - Vercel / Netlify Functions / Cloudflare Pages Functions: ten plik (lub
//    jego drobna adaptacja do konkretnego SDK) wystarczy — ustaw zmienną
//    środowiskową `MAPBOX_TOKEN` w panelu hostingu.
//  - GitHub Pages (hosting statyczny) NIE potrafi uruchamiać funkcji
//    serverless — na GH Pages ten endpoint po prostu nie istnieje, front-end
//    dostanie 404 i pokaże użytkownikowi jasny komunikat + przełączy się na
//    ręczne wprowadzanie czasu jazdy (patrz `services/mapboxService.ts`).
//    Do pełnego działania routingu z mapy potrzebny jest host z Node.js
//    (np. Vercel) — patrz README.
//
// Lokalne developerskie środowisko (`npm run dev`) korzysta z tej SAMEJ
// logiki przez middleware Vite w `vite.config.ts` (`devApiMiddleware`), więc
// można przetestować integrację lokalnie bez wdrażania na Vercel.

export interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}

export interface VercelLikeResponse {
  status(code: number): VercelLikeResponse;
  json(data: unknown): void;
}

interface DirectionsBody {
  coordinates: [number, number][]; // [lon, lat]
  alternatives?: boolean;
}

interface MapboxRoute {
  distance: number; // metry
  duration: number; // sekundy
  geometry: { coordinates: [number, number][] };
}

interface MapboxDirectionsApiResponse {
  routes?: MapboxRoute[];
  message?: string;
}

/** Rdzeń logiki — wyodrębniony, żeby dało się go przetestować i użyć zarówno
 *  z handlera Vercel, jak i z developerskiego middleware Vite. */
export async function handleDirections(body: DirectionsBody, token: string | undefined) {
  if (!token) {
    return { status: 501, json: { error: "MAPBOX_TOKEN not configured" } };
  }
  if (!body?.coordinates || body.coordinates.length < 2) {
    return { status: 400, json: { error: "Potrzeba przynajmniej dwóch punktów." } };
  }

  const coordsStr = body.coordinates.map(([lon, lat]) => `${lon},${lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}`);
  url.searchParams.set("alternatives", String(body.alternatives ?? true));
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", token);

  const resp = await fetch(url.toString());
  const data = (await resp.json()) as MapboxDirectionsApiResponse;

  if (!resp.ok || !data.routes || data.routes.length === 0) {
    return { status: 502, json: { error: data.message ?? "Mapbox Directions API nie zwróciło trasy." } };
  }

  const alternatywy = data.routes.map((r) => ({
    dystansKm: Math.round((r.distance / 1000) * 10) / 10,
    czasMin: Math.round(r.duration / 60),
    geometry: r.geometry.coordinates,
  }));

  // Kraje wykrywane przez odwrotne geokodowanie punktów trasy odbywa się w
  // front-endzie (geocodingService, Nominatim) — tu zwracamy pustą listę,
  // którą wywołujący uzupełnia na podstawie geokodowanych waypointów.
  return { status: 200, json: { alternatywy, kraje: [] } };
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const result = await handleDirections(req.body as DirectionsBody, process.env.MAPBOX_TOKEN);
  res.status(result.status).json(result.json);
}
