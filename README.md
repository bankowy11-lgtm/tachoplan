# TachoPlan 2.0

Aplikacja mobilna PWA dla kierowcy transportu drogowego — planowanie całej
podróży (START → TRASA → KRAJE/MIASTA → CZAS JAZDY → PAUZY → PARKINGI →
ODPOCZYNKI → ALARMY → PRZYJAZD) zgodnie z czasem jazdy i odpoczynku
(rozporządzenie (WE) 561/2006).

> Budowa aplikacji jest podzielona na dwa etapy (zaproponowane przez
> użytkownika, żeby generator nie "zgubił" najważniejszego silnika
> obliczeniowego):
>
> - **Etap 1 (ten stan repo):** silnik obliczeniowy + reguły + planowanie
>   wsteczne + geokodowanie i mapa (bez klucza API) + integracja z Mapbox
>   (architektura gotowa, wymaga własnego tokenu) + profile pojazdu/kierowcy +
>   kreator pierwszego uruchomienia + historia/ulubione + tryb kierowcy +
>   testy automatyczne.
> - **Etap 2 (do zrobienia):** żywe wyszukiwanie parkingów (Overpass API),
>   alarmy tachografu/parkingu/odpoczynku, powiadomienia systemowe (Notification
>   API), pełny tryb dwóch kierowców.

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Otwórz `http://localhost:5173` (najlepiej z narzędziami deweloperskimi
przełączonymi na widok mobilny — aplikacja jest projektowana mobile-first).

### Automatyczne wyznaczanie trasy (Mapbox) — opcjonalne

Geokodowanie miast i mapa działają od razu, bez żadnego klucza (Nominatim +
OpenStreetMap/Leaflet). Żeby dodatkowo mieć **rzeczywisty przebieg drogi,
dystans i czas z Mapbox Directions API** zamiast orientacyjnej linii prostej:

1. Załóż darmowe konto na [mapbox.com](https://www.mapbox.com/) i utwórz
   token (Directions API).
2. Skopiuj `.env.example` do `.env` i wpisz `MAPBOX_TOKEN=...` (BEZ prefiksu
   `VITE_` — dzięki temu token nigdy nie trafia do kodu front-endowego).
3. `npm run dev` — lokalny middleware Vite (`vite.config.ts`) obsłuży
   `/api/directions` dokładnie tak samo, jak zrobi to serverless function na
   produkcji.

Bez tokenu aplikacja działa w pełni — po prostu pokazuje to jawnie i pozwala
wpisać czas jazdy ręcznie (nigdy nie udaje prawdziwej trasy).

## Build produkcyjny i wdrożenie

```bash
npm run build
npm run preview
```

`npm run build` generuje `dist/` wraz z `manifest.webmanifest` i service
workerem (`sw.js`) — gotowe do zainstalowania jako PWA.

- **GitHub Pages / dowolny hosting statyczny:** działa w pełni, OPRÓCZ
  `/api/directions` (hosting statyczny nie uruchamia funkcji serverless) —
  routing z mapy pokaże użytkownikowi jasny komunikat i przełączy się na
  ręczne wprowadzanie czasu jazdy. Geokodowanie/mapa (Nominatim + Leaflet)
  działają normalnie, bo to zwykłe zapytania z przeglądarki.
- **Vercel / Netlify / Cloudflare Pages (z funkcjami):** wdróż `api/directions.ts`
  jako serverless function (na Vercel wystarczy sam plik w `/api`), ustaw
  zmienną środowiskową `MAPBOX_TOKEN` w panelu hostingu — routing z mapy
  zacznie działać w pełni.

## Testy

```bash
npm test
```

Pokrywają wymagany zestaw TEST A–H z silnika planowania (`src/engine/`) oraz
silnik wyboru parkingu (`src/parking/`) — patrz
[`src/engine/tripPlanner.test.ts`](src/engine/tripPlanner.test.ts).

## Struktura kodu

- [`src/tachographRules.ts`](src/tachographRules.ts) — **jedyne** miejsce, w
  którym zapisane są liczby wynikające z przepisów (limity jazdy, przerwy,
  odpoczynki, w tym odpoczynek tygodniowy). Wersjonowane (`RULES_VERSION`),
  edytowalne z poziomu ekranu **Ustawienia**.
- [`src/engine/tripPlanner.ts`](src/engine/tripPlanner.ts) — silnik
  planowania: symulacja "w przód" (`simulateForward`, z automatycznym
  wstawianiem przerw/odpoczynków dobowych/odpoczynku tygodniowego i blokadą
  planu przy przekroczeniu limitu dwutygodniowego), planowanie "wstecz"
  (`planTripBackward`), funkcja "Czy zdążę?" (`czyZdaze`).
- [`src/engine/liveStatus.ts`](src/engine/liveStatus.ts) — stan „na żywo” dla
  ekranu Jazda / Trybu kierowcy.
- [`src/parking/ParkingRanker.ts`](src/parking/ParkingRanker.ts) — silnik
  wyboru najlepszego parkingu (gotowy i przetestowany; czeka na żywe źródło
  danych — Etap 2).
- [`src/services/geocodingService.ts`](src/services/geocodingService.ts) —
  geokodowanie miast przez Nominatim/OSM (bez klucza).
- [`src/services/mapboxService.ts`](src/services/mapboxService.ts) +
  [`api/directions.ts`](api/directions.ts) — routing przez Mapbox Directions
  API, klucz wyłącznie po stronie serwera.
  [`src/services/googleMapsService.ts`](src/services/googleMapsService.ts) —
  przygotowana architektura pod alternatywnego dostawcę.
- `src/screens/` — Start (formularz + planowanie trasy przez miasta/kraje +
  mapa), Trasa (wynik + oś czasu), Jazda (na żywo + tryb kierowcy), Parkingi
  (status Etapu 2), Tachograf, Historia (+ ulubione), Ustawienia (+ profile
  pojazdu/kierowcy), CzyZdaze, Wizard (kreator pierwszego uruchomienia).
- `src/components/` — komponenty UI wielokrotnego użytku, w tym
  `components/Route/RouteBuilder.tsx` (punkty pośrednie + warianty trasy) i
  `components/Map/RouteMap.tsx` (mapa Leaflet/OSM).
- `src/storage.ts` — trwałość danych w `localStorage` (trasy, opcje,
  tachograf, pojazdy, kierowcy, ustawienia aplikacji) — aplikacja działa w
  pełni offline poza geokodowaniem/routingiem.

## Uwaga prawna

TachoPlan jest narzędziem pomocniczym do planowania podróży. Wyniki nie
zastępują rzeczywistych zapisów tachografu ani obowiązujących przepisów.
Kierowca jest odpowiedzialny za prawidłową organizację czasu pracy, jazdy i
odpoczynku.
