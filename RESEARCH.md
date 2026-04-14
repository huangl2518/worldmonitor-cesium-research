# WorldMonitor CesiumJS Migration Research

## Current Architecture

### Map Stack
- **deck.gl 9.2.11** — WebGL-accelerated data layer rendering
- **MapLibre GL JS 5.16.0** — 2D basemap renderer
- **@deck.gl/mapbox** — `MapboxOverlay` integrates deck.gl layers on top of MapLibre
- **PMTiles (Protomaps)** — Self-hosted vector tile basemap via `pmtiles://` protocol

### Layer Types Used (in DeckGLMap.ts)
- ScatterplotLayer — points (hotspots, nuclear, ports, etc.)
- PathLayer — lines (cables, pipelines)
- GeoJsonLayer — polygons (conflict zones)
- IconLayer — icons (bases, datacenters, nuclear)
- TextLayer — labels
- PolygonLayer — polygons
- ArcLayer — trade route arcs
- HeatmapLayer — density visualization
- H3HexagonLayer — H3 hex bins (GPS jamming)
- TripsLayer — animated paths
- PathStyleExtension — dashed lines

### Data Sources
- 33 hardcoded TypeScript config arrays (points/polygons)
- API-fetched dynamic data (earthquakes, flights, AIS, weather, etc.)
- PMTiles vector basemap

## Migration Approaches

### Approach 1: deck.gl GlobeView (RECOMMENDED — Simplest)

deck.gl 9.x includes a built-in `GlobeView` that renders a 3D globe instead of a
2D map. All existing deck.gl layers work unchanged.

**Pros:**
- Zero layer code changes — all ScatterplotLayer, PathLayer, etc. work as-is
- No new dependencies beyond what's already installed
- Maintains deck.gl's GPU-accelerated rendering
- Simple API: just change the view from `MapView` to `GlobeView`

**Cons:**
- No 3D terrain (unless using elevation data)
- No Cesium Ion integration (satellite imagery, 3D tiles)
- Less "photorealistic" than CesiumJS
- Globe interaction may differ from 2D map

**Implementation:**
```typescript
import { GlobeView } from '@deck.gl/core';

// Replace MapView with GlobeView
const view = new GlobeView({
  id: 'globe',
  latitude: 0,
  longitude: 0,
  zoom: 1,
});

// All existing layers work unchanged
```

### Approach 2: CesiumJS + deck.gl Interop

Use CesiumJS as the 3D globe renderer with deck.gl layers on top.

**Pros:**
- 3D terrain, photorealistic globe
- Cesium Ion data (satellite imagery, 3D buildings)
- Industry-standard 3D geospatial engine

**Cons:**
- Complex integration between two rendering engines
- deck.gl layers may not render correctly on CesiumJS globe
- `@deck.gl/cesium` module status unclear (was experimental)
- New large dependency (~5MB gzipped)
- Potential performance issues with dual WebGL contexts

**Libraries to investigate:**
- `@deck.gl/cesium` — Official but experimental interop
- `cesium-deckgl-interop-example` — Community POC (0 stars)
- Custom overlay approach — Render deck.gl on transparent canvas over Cesium

### Approach 3: Full CesiumJS Rewrite

Replace both MapLibre and deck.gl with pure CesiumJS.

**Pros:**
- Single rendering engine
- Best 3D performance and features
- Native support for 3D Tiles, terrain, etc.

**Cons:**
- Massive rewrite (~6600 lines of DeckGLMap.ts)
- All layer rendering code must be rewritten as Cesium entities/primitives
- Lose deck.gl's declarative layer API
- Lose deck.gl's GPU-accelerated point/line rendering optimizations

### Approach 4: CesiumJS Basemap + deck.gl GlobeView

Use CesiumJS for basemap (terrain + imagery) and deck.gl GlobeView for data layers.

**Pros:**
- Best of both worlds
- Cesium handles terrain/imagery, deck.gl handles data
- Less rewriting than full Cesium rewrite

**Cons:**
- Complex synchronization between two libraries
- May have rendering order/z-index issues

## Vector Tile (PMTiles/MVT) in 3D

The current basemap uses PMTiles (PBF vector tiles) via MapLibre. In a 3D globe:

- **GlobeView**: deck.gl can use `TileLayer` with GeoJSON/MVT tiles
- **CesiumJS**: Can use `UrlTemplateImageryProvider` for raster tiles, or
  custom `VectorTileProvider` for PBF tiles (requires additional library)

### PMTiles in CesiumJS Options
1. Convert PMTiles to raster tiles (pre-rendered)
2. Use `pmtiles` npm package to read PMTiles, convert features to GeoJSON,
   render with deck.gl layers on Cesium
3. Use Cesium Ion to host/process vector tiles

## Recommended Migration Path

### Phase 1: GlobeView POC (Immediate)
1. Create a minimal POC using deck.gl GlobeView
2. Test with existing hardcoded data layers
3. Verify all layer types render correctly on globe
4. Test basemap imagery providers (OpenFreeMap raster tiles)

### Phase 2: Basemap Migration
1. If GlobeView works, add basemap imagery (raster tiles or custom)
2. Handle PMTiles → raster tile conversion if needed
3. Test globe interaction (rotate, zoom, click)

### Phase 3: Full Integration
1. Replace MapLibre with GlobeView in DeckGLMap.ts
2. Adapt popup/tooltip positioning for globe
3. Handle view state management (globe vs 2D toggle?)

### Phase 4: CesiumJS Enhancement (Optional)
1. If GlobeView is insufficient, integrate CesiumJS for terrain
2. Use deck.gl + Cesium interop for data layers
3. Add 3D terrain, buildings, etc.

## Timeline
- Phase 1 (POC): Tonight
- Phase 2-3: Follow-up sessions
- Phase 4: If needed for advanced 3D features
