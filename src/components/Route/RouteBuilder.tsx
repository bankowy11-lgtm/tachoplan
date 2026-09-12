// RouteBuilder.tsx — planowanie trasy przez miasta (§5) i kraje (§6, §25),
// automatyczne wyznaczanie trasy (§4) i mapa (§32). Prawdziwa integracja:
// geokodowanie przez Nominatim (bez klucza), trasa przez Mapbox (przez
// backend proxy, gdy skonfigurowany), z jawnym stanem "brak danych" gdy
// któryś z tych kroków się nie powiedzie — bez fikcyjnych danych (§43).

import { useEffect, useState } from "react";
import { geocode, odlegloscHaversineKm } from "../../services/geocodingService";
import { getDirections } from "../../services/mapboxService";
import RouteMap, { type RouteMapPoint } from "../Map/RouteMap";
import type { GeocodedPlace, RouteAlternative } from "../../types";

export interface RouteBuilderResult {
  /** Wybrany wariant trasy (dystans/czas), gotowy do wpisania jako czas jazdy. */
  dystansKm: number;
  czasJazdyMin: number;
  /** Czy dane pochodzą z prawdziwego routingu (Mapbox) czy z linii prostej. */
  rzeczywistaTrasa: boolean;
  kraje: string[];
  miasta: string[];
}

type StatusGeokodowania = "brak" | "trwa" | "ok" | "blad";

export default function RouteBuilder({
  start,
  cel,
  waypoints,
  onWaypointsChange,
  onResult,
  sredniaPredkoscKmH,
}: {
  start: string;
  cel: string;
  waypoints: string[];
  onWaypointsChange: (w: string[]) => void;
  onResult: (r: RouteBuilderResult | null) => void;
  /** Używana do przeliczenia km → czas, gdy brak prawdziwego routingu. */
  sredniaPredkoscKmH: number;
}) {
  const [nowyPunkt, setNowyPunkt] = useState("");
  const [geokody, setGeokody] = useState<Record<string, GeocodedPlace | null>>({});
  const [statusy, setStatusy] = useState<Record<string, StatusGeokodowania>>({});
  const [alternatywy, setAlternatywy] = useState<RouteAlternative[] | null>(null);
  const [wybranyWariantId, setWybranyWariantId] = useState<string | null>(null);
  const [trwaSzukanie, setTrwaSzukanie] = useState(false);
  const [bladTrasy, setBladTrasy] = useState<string | null>(null);
  const [rzeczywistaTrasa, setRzeczywistaTrasa] = useState(false);

  const wszystkiePunkty = [start, ...waypoints, cel].filter((p) => p.trim().length > 0);

  async function geokodujPunkt(nazwa: string) {
    const key = nazwa.trim();
    if (!key || geokody[key] !== undefined) return;
    setStatusy((s) => ({ ...s, [key]: "trwa" }));
    const p = await geocode(key);
    setGeokody((g) => ({ ...g, [key]: p }));
    setStatusy((s) => ({ ...s, [key]: p ? "ok" : "blad" }));
  }

  // Geokoduj automatycznie nowe/zmienione punkty.
  useEffect(() => {
    wszystkiePunkty.forEach((p) => {
      if (geokody[p.trim()] === undefined) void geokodujPunkt(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, cel, waypoints.join("|")]);

  function przesunPunkt(i: number, kierunek: -1 | 1) {
    const kopiuj = [...waypoints];
    const j = i + kierunek;
    if (j < 0 || j >= kopiuj.length) return;
    [kopiuj[i], kopiuj[j]] = [kopiuj[j], kopiuj[i]];
    onWaypointsChange(kopiuj);
  }

  function usunPunkt(i: number) {
    onWaypointsChange(waypoints.filter((_, idx) => idx !== i));
  }

  function dodajPunkt() {
    if (!nowyPunkt.trim()) return;
    onWaypointsChange([...waypoints, nowyPunkt.trim()]);
    setNowyPunkt("");
  }

  const wszystkieZgeokodowane =
    wszystkiePunkty.length >= 2 && wszystkiePunkty.every((p) => geokody[p.trim()]);

  async function pobierzTrasa() {
    setBladTrasy(null);
    setAlternatywy(null);
    if (!wszystkieZgeokodowane) {
      setBladTrasy("Poczekaj, aż wszystkie punkty zostaną zlokalizowane (albo poprawiono ich nazwy).");
      return;
    }
    const coords = wszystkiePunkty.map((p) => geokody[p.trim()]!).map((g) => ({ lat: g.lat, lon: g.lon }));

    setTrwaSzukanie(true);
    const odp = await getDirections({ coordinates: coords, alternatives: true });
    setTrwaSzukanie(false);

    if (odp.available) {
      setAlternatywy(odp.result.alternatywy);
      setWybranyWariantId(odp.result.alternatywy[0]?.id ?? null);
      setRzeczywistaTrasa(true);
    } else {
      setBladTrasy(odp.reason);
      // Fallback: linia prosta między geokodowanymi punktami + szacowany czas z prędkości średniej.
      let suma = 0;
      for (let i = 0; i < coords.length - 1; i++) suma += odlegloscHaversineKm(coords[i], coords[i + 1]);
      const dystansPrzybl = Math.round(suma * 1.2); // +20% na realny przebieg drogi vs linia prosta
      const czasPrzybl = sredniaPredkoscKmH > 0 ? Math.round((dystansPrzybl / sredniaPredkoscKmH) * 60) : 0;
      const wariant: RouteAlternative = {
        id: "linia-prosta",
        etykieta: "Orientacyjna (linia prosta)",
        dystansKm: dystansPrzybl,
        czasMin: czasPrzybl,
        geometry: coords,
      };
      setAlternatywy([wariant]);
      setWybranyWariantId(wariant.id);
      setRzeczywistaTrasa(false);
    }
  }

  const wybranyWariant = alternatywy?.find((a) => a.id === wybranyWariantId) ?? null;

  useEffect(() => {
    if (!wybranyWariant) {
      onResult(null);
      return;
    }
    const kraje = Array.from(
      new Set(
        wszystkiePunkty
          .map((p) => geokody[p.trim()]?.country)
          .filter((c): c is string => Boolean(c))
      )
    );
    const miasta = Array.from(
      new Set(
        wszystkiePunkty
          .map((p) => geokody[p.trim()]?.city ?? p)
          .filter((c): c is string => Boolean(c))
      )
    );
    onResult({
      dystansKm: wybranyWariant.dystansKm,
      czasJazdyMin: wybranyWariant.czasMin,
      rzeczywistaTrasa,
      kraje,
      miasta,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wybranyWariantId, alternatywy, rzeczywistaTrasa]);

  const mapPoints: RouteMapPoint[] = [];
  if (start.trim() && geokody[start.trim()]) mapPoints.push({ place: geokody[start.trim()]!, rola: "start" });
  waypoints.forEach((w) => {
    if (w.trim() && geokody[w.trim()]) mapPoints.push({ place: geokody[w.trim()]!, rola: "waypoint" });
  });
  if (cel.trim() && geokody[cel.trim()]) mapPoints.push({ place: geokody[cel.trim()]!, rola: "cel" });

  const kraje = Array.from(
    new Set(mapPoints.map((p) => p.place.country).filter((c): c is string => Boolean(c)))
  );

  function ikonaStatusu(nazwa: string) {
    const st = statusy[nazwa.trim()];
    if (!nazwa.trim()) return null;
    if (st === "trwa") return <span title="Szukam...">⏳</span>;
    if (st === "ok") return <span title="Znaleziono">✅</span>;
    if (st === "blad") return <span title="Nie znaleziono">❌</span>;
    return null;
  }

  return (
    <div>
      <div className="section-title" style={{ margin: "16px 2px 8px" }}>
        Punkty pośrednie (miasta)
      </div>

      {waypoints.length === 0 && (
        <div className="hint" style={{ marginBottom: 8 }}>
          Brak punktów pośrednich — trasa START → CEL bezpośrednio.
        </div>
      )}

      {waypoints.map((w, i) => (
        <div key={i} className="field" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="text"
              value={w}
              placeholder="np. Brno, Czechy"
              onChange={(e) => {
                const kopiuj = [...waypoints];
                kopiuj[i] = e.target.value;
                onWaypointsChange(kopiuj);
              }}
              onBlur={() => void geokodujPunkt(w)}
              style={{ flex: 1 }}
            />
            <span style={{ width: 20, textAlign: "center" }}>{ikonaStatusu(w)}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => przesunPunkt(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => przesunPunkt(i, 1)}
              disabled={i === waypoints.length - 1}
            >
              ↓
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => usunPunkt(i)}>
              ✕
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <input
          type="text"
          placeholder="np. Wiedeń, Austria"
          value={nowyPunkt}
          onChange={(e) => setNowyPunkt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dodajPunkt()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-secondary" style={{ width: "auto", padding: "0 16px" }} onClick={dodajPunkt}>
          ＋ Dodaj punkt
        </button>
      </div>

      {kraje.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {kraje.map((k) => (
            <span
              key={k}
              style={{
                background: "var(--graphite)",
                border: "1px solid var(--card-border)",
                borderRadius: 20,
                padding: "5px 12px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {k}
            </span>
          ))}
        </div>
      )}

      <button className="btn btn-primary" onClick={pobierzTrasa} disabled={trwaSzukanie || !wszystkieZgeokodowane}>
        {trwaSzukanie ? "⏳ Wyznaczanie trasy..." : "🗺️ Pobierz trasę z mapy"}
      </button>

      {bladTrasy && <div className="warning-box" style={{ marginTop: 10 }}>⚠️ {bladTrasy}</div>}

      {alternatywy && alternatywy.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-title" style={{ margin: "0 0 8px" }}>
            Wariant trasy
          </div>
          {alternatywy.map((a) => (
            <button
              key={a.id}
              onClick={() => setWybranyWariantId(a.id)}
              className="card"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                border: a.id === wybranyWariantId ? "1.5px solid var(--accent)" : "1px solid var(--card-border)",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {a.id === wybranyWariantId ? "✅ " : ""}
                {a.etykieta === "Najszybsza" ? "⚡ " : a.etykieta === "Alternatywna" ? "🛣️ " : "🚛 "}
                {a.etykieta}
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
                {a.dystansKm} km · {Math.floor(a.czasMin / 60)} h {a.czasMin % 60} min
              </div>
            </button>
          ))}
        </div>
      )}

      {mapPoints.length >= 1 && (
        <div style={{ marginTop: 14 }}>
          <RouteMap
            points={mapPoints}
            geometry={wybranyWariant?.geometry}
            geometryIsReal={rzeczywistaTrasa}
          />
        </div>
      )}
    </div>
  );
}
