# PMTiles Vector Tiles in 3D Globe Context

## Problem
WorldMonitor uses PMTiles (PBF vector tiles) for its basemap via MapLibre GL JS.
When migrating to a 3D globe (deck.gl GlobeView or CesiumJS), PMTiles support
is different.

## Current Setup
- PMTiles served from R2 CDN via `pmtiles://` protocol
- MapLibre GL handles PBF parsing and rendering
- Protomaps basemaps provides the style layers
- Fallback to OpenFreeMap raster tiles

## Solutions for 3D Globe

### Option 1: Raster Tiles (Recommended for GlobeView)
Use pre-rendered raster tiles instead of vector tiles.

```typescript
// Use OpenFreeMap or similar raster tile provider
const basemap = new TileLayer({
  id: 'basemap',
  data: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  renderSubLayers: props => new BitmapLayer(props, {
    image: props.data,
    bounds: [props.tile.bbox.west, props.tile.bbox.south,
             props.tile.bbox.east, props.tile.bbox.north],
  }),
});
```

Pros: Simple, no PBF parsing needed
Cons: No dynamic styling, larger tile sizes

### Option 2: PMTiles + GeoJSON Conversion
Use the `pmtiles` npm package to read PMTiles, decompress PBF to GeoJSON,
render with deck.gl GeoJsonLayer.

```typescript
import { PMTiles, FetchSource } from 'pmtiles';

const pmtiles = new PMTiles(new FetchSource('https://your-bucket/pmtiles.pmtiles'));

// For each visible tile:
const header = await pmtiles.getHeader();
const tileData = await pmtiles.getZxy(z, x, y);
// Decompress PBF to GeoJSON
const geojson = geobufDecode(tileData.data);
// Render with deck.gl
new GeoJsonLayer({ data: geojson, ... });
```

Pros: Full vector tile data, dynamic styling possible
Cons: Complex, performance overhead, needs PBF decoder

### Option 3: Cesium Ion Vector Tiles
Host vector tiles on Cesium Ion for native CesiumJS support.

Pros: Best CesiumJS integration
Cons: Requires Cesium Ion account, data migration

### Option 4: Hybrid Approach (Best of Both)
Use deck.gl GlobeView for data layers + raster basemap tiles.
Skip PMTiles entirely for the basemap, use pre-rendered tiles.

```typescript
// Data layers: deck.gl (unchanged from current code)
new ScatterplotLayer({ data: hotspots, ... })
new PathLayer({ data: cables, ... })

// Basemap: raster tiles
new TileLayer({
  data: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  renderSubLayers: props => new BitmapLayer(...)
})
```

## Implementation Notes

### pmtiles npm package
```bash
npm install pmtiles
```

The `pmtiles` package provides:
- `PMTiles` class for reading PMTiles archives
- Works in browser and Node.js
- Supports HTTP range requests (efficient)
- Returns raw tile data (PBF bytes)

### PBF Decoding
For converting PBF tiles to GeoJSON:
```bash
npm install geobuf pbf
```
Or use `@mapbox/vector-tile` for direct PBF parsing.

### Performance Considerations
- PMTiles with range requests: efficient, only downloads needed tiles
- PBF → GeoJSON conversion: adds ~5-10ms per tile
- deck.gl GeoJsonLayer: handles large GeoJSON well with GPU acceleration
- Raster tiles: simplest but no dynamic styling

## Recommendation
For the initial migration, use **Option 4 (Hybrid Approach)**:
- deck.gl GlobeView for all data layers (zero code changes)
- Raster tiles for basemap (simple, reliable)
- Investigate PMTiles → GeoJSON conversion later if dynamic basemap styling is needed
