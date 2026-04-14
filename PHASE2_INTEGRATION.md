# Phase 2: Integration Implementation

## Created Files

### `src/components/GlobeMapView.ts`
Drop-in replacement for MapLibre + MapboxOverlay using deck.gl GlobeView.

**Classes:**
- `GlobeMapView` — Core globe component with DeckGL + GlobeView
- `GlobeMapOverlay` — MapboxOverlay-compatible wrapper for easy migration

**Key APIs (matching MapboxOverlay):**
- `setProps({ layers })` — Update deck.gl layers
- `finalize()` — Clean up

**Basemap modes:**
- `dark` — Solid dark background (default, best for WorldMonitor theme)
- `raster` — OpenStreetMap raster tiles
- `none` — No basemap

## Migration Path

### Minimal Changes Required

```diff
// DeckGLMap.ts changes:

- import { MapboxOverlay } from '@deck.gl/mapbox';
- import maplibregl from 'maplibre-gl';
+ import { GlobeMapOverlay } from './GlobeMapView';

- private deckOverlay: MapboxOverlay | null = null;
+ private deckOverlay: GlobeMapOverlay | null = null;

- private initMapLibre(): void { ... maplibregl.Map ... }
- private initDeck(): void { ... MapboxOverlay ... maplibreMap.addControl ... }
+ private initGlobe(): void {
+   this.deckOverlay = new GlobeMapOverlay({
+     container: this.container,
+     basemap: 'dark',
+     layers: this.buildLayers(),
+     getTooltip: (info) => this.getTooltip(info),
+     onClick: (info) => this.handleClick(info),
+     pickingRadius: 10,
+   });
+ }

// UNCHANGED — all layer code works as-is:
  private buildLayers(): any[] { ... }
  private createHotspotsLayer(): ScatterplotLayer { ... }
  private createCablesLayer(): PathLayer { ... }
  // ... all 30+ layer methods unchanged
```

### What Gets Removed
- `maplibre-gl` dependency (~300KB gzipped)
- `@deck.gl/mapbox` dependency
- PMTiles protocol registration
- MapLibre map initialization (750 lines of error handling, fallback logic)
- Map event handlers (move, zoom, style load)

### What Gets Added
- `GlobeMapView.ts` (~250 lines)
- GlobeView from `@deck.gl/core` (already included in deck.gl 9.x)

### What Stays the Same
- All ~30 data layer definitions in `buildLayers()`
- Data fetching services
- Layer toggle state management
- Popup/tooltip content and logic
- Hotspot escalation logic
- All config files (geo.ts, pipelines.ts, etc.)

## Benefits

1. **3D Globe** — Rotating earth instead of flat map
2. **Smaller bundle** — Remove MapLibre (~300KB gzipped)
3. **Simpler code** — Remove 750+ lines of MapLibre error handling
4. **Same layers** — Zero changes to data layer code
5. **Better performance** — Direct DeckGL rendering without MapLibre interop

## Trade-offs

1. **No 3D terrain** — GlobeView is a smooth sphere (can add elevation data later)
2. **Basemap change** — Raster tiles instead of styled vector tiles
3. **No vector tile styling** — PMTiles dynamic styling lost (can add back later)
4. **Globe interaction** — Different mouse/touch behavior than flat map

## Next Steps

1. Test GlobeMapView with all 33 data layers
2. Optimize basemap tile loading
3. Add optional CesiumJS terrain integration
4. Implement PMTiles → GeoJSON conversion for dynamic basemap
5. Add flat map / globe toggle
