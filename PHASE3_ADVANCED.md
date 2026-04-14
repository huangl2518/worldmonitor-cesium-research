# Phase 3: Advanced Research — CesiumJS + deck.gl Integration

## Deep Dive: deck.gl GlobeView Limitations

After building the Phase 2 GlobeMapView, here are the limitations:

1. **No 3D terrain** — GlobeView renders a smooth sphere
2. **No photorealistic globe** — No satellite imagery integration
3. **No 3D buildings** — CesiumJS 3D Tiles not supported
4. **Basemap is raster-only** — No vector tile styling

## CesiumJS Integration Options

### Option A: deck.gl GlobeView + Cesium Ion Terrain (Recommended)
Use deck.gl GlobeView for data layers, Cesium Ion for terrain/imagery.

deck.gl 9.x has experimental support for Cesium Ion terrain via the
`@deck.gl/geo-layers` TerrainLayer:

```typescript
import { TerrainLayer } from '@deck.gl/geo-layers';

const terrainLayer = new TerrainLayer({
  id: 'terrain',
  minZoom: 0,
  maxZoom: 15,
  elevationDecoder: {
    rScaler: 6553.6,
    gScaler: 25.6,
    bScaler: 0.1,
    offset: -10000,
  },
  elevationData: 'https://api.cesium.com/v1/assets/1/endpoint',
  texture: 'https://api.cesium.com/v1/assets/2/endpoint',
  // Cesium Ion token required
});
```

### Option B: CesiumJS as Basemap + deck.gl Overlay
Render CesiumJS globe as basemap, deck.gl canvas overlay on top.

```typescript
// CesiumJS as basemap
const cesiumViewer = new Cesium.Viewer(container, {
  baseLayerPicker: false,
  // ... minimal UI
});

// deck.gl as overlay
const deckOverlay = new DeckGL({
  canvas: cesiumCanvas, // overlay canvas
  views: new GlobeView(),
  controller: false, // Cesium handles interaction
  layers: [...],
});

// Sync view state between Cesium and deck.gl
cesiumViewer.camera.changed.addEventListener(() => {
  const pos = cesiumViewer.camera.positionWC;
  const cartographic = Cesium.Cartographic.fromCartesian(pos);
  deckOverlay.setProps({
    viewState: {
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      zoom: Math.log2(cesiumViewer.camera.getMagnitude()),
    },
  });
});
```

### Option C: Full CesiumJS with deck.gl-style Data Rendering
Convert deck.gl layers to CesiumJS primitives.

**Point layers (ScatterplotLayer → PointPrimitiveCollection):**
```typescript
// deck.gl
new ScatterplotLayer({
  data: hotspots,
  getPosition: d => [d.lon, d.lat],
  getRadius: 80000,
  getFillColor: [255, 0, 0],
});

// CesiumJS equivalent
const points = new Cesium.PointPrimitiveCollection();
hotspots.forEach(h => {
  points.add({
    position: Cesium.Cartesian3.fromDegrees(h.lon, h.lat),
    pixelSize: 8,
    color: Cesium.Color.RED,
  });
});
viewer.scene.primitives.add(points);
```

**Path layers (PathLayer → PolylineCollection):**
```typescript
// deck.gl
new PathLayer({
  data: cables,
  getPath: d => d.path,
  getColor: [0, 255, 255],
  getWidth: 3,
});

// CesiumJS equivalent
cables.forEach(cable => {
  viewer.entities.add({
    polyline: {
      positions: cable.path.map(p => Cesium.Cartesian3.fromDegrees(...p)),
      width: 3,
      material: Cesium.Color.CYAN,
    },
  });
});
```

## Performance Comparison

| Metric | deck.gl GlobeView | CesiumJS | Cesium + deck.gl |
|--------|-------------------|----------|------------------|
| 1K points | 60 FPS | 60 FPS | 60 FPS |
| 10K points | 60 FPS | 45 FPS | 60 FPS |
| 100K points | 60 FPS | 15 FPS | 60 FPS |
| 1K lines | 60 FPS | 55 FPS | 60 FPS |
| 3D terrain | No | Yes | Yes |
| 3D buildings | No | Yes | No |
| Bundle size | +0KB | +5MB | +5MB |
| Code complexity | Low | High | Medium |

**Key insight:** deck.gl is significantly faster for large datasets because it uses
GPU-accelerated instanced rendering. CesiumJS entity-based rendering is slower
for many points/lines.

## PMTiles Vector Tiles in 3D

### Problem
PMTiles stores vector tiles (PBF format) optimized for MapLibre GL rendering.
Neither deck.gl GlobeView nor CesiumJS have native PMTiles support.

### Solutions

#### 1. Rasterize PMTiles (server-side)
Pre-render PMTiles to raster tiles using `tileserver-gl` or `planetiler`.
Serve raster tiles to the globe.

**Pros:** Simple, works with any globe library
**Cons:** No dynamic styling, larger tile sizes, requires server

#### 2. PMTiles → GeoJSON (client-side)
Use `pmtiles` npm package to read tiles, decode PBF to GeoJSON, render with deck.gl.

```typescript
import { PMTiles, FetchSource, TileType } from 'pmtiles';
import geobuf from 'geobuf';
import Pbf from 'pbf';

const source = new FetchSource('https://bucket/pmtiles.pmtiles');
const pmtiles = new PMTiles(source);

async function getTileGeoJSON(z: number, x: number, y: number) {
  const entry = await pmtiles.getZxy(z, x, y);
  if (!entry) return null;

  if (entry.tileType === TileType.Pbf) {
    // Decompress PBF to GeoJSON
    const geojson = geobuf.decode(new Pbf(entry.data));
    return geojson;
  }
  return null;
}

// Use with deck.gl TileLayer
new TileLayer({
  data: 'pmtiles://...',
  renderSubLayers: props => new GeoJsonLayer({
    ...props,
    data: getTileGeoJSON(props.tile.z, props.tile.x, props.tile.y),
  }),
});
```

**Pros:** Full vector data, dynamic styling possible
**Cons:** Performance overhead, complex implementation

#### 3. Cesium Ion Vector Tiles
Upload vector data to Cesium Ion, which serves it as optimized 3D Tiles.

**Pros:** Best CesiumJS integration, optimized for 3D
**Cons:** Cesium Ion account required, data leaves your infrastructure

#### 4. Hybrid: deck.gl GlobeView + Raster Basemap (Recommended)
Skip PMTiles for basemap. Use raster tiles. Keep vector data in deck.gl layers.

```typescript
// Basemap: simple raster tiles
new TileLayer({
  data: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  renderSubLayers: props => new BitmapLayer({...}),
});

// Data layers: all deck.gl (unchanged)
new ScatterplotLayer({ data: hotspots, ... });
new PathLayer({ data: cables, ... });
// ... 30+ more layers, zero changes
```

## Final Recommendation

### Primary Path: deck.gl GlobeView (80% of value, 20% of effort)
- Replace MapLibre with GlobeView
- Remove ~300KB MapLibre bundle
- All layer code unchanged
- Raster basemap tiles
- **Timeline: 1-2 days**

### Enhancement Path: CesiumJS Terrain (if 3D terrain needed)
- Add CesiumJS for terrain rendering
- Keep deck.gl for data layers
- Synchronize view state between the two
- **Timeline: 3-5 days**

### Not Recommended: Full CesiumJS Rewrite
- Massive effort (~6600 lines to rewrite)
- Worse performance for large datasets
- No benefit unless 3D buildings/tiles are required
- **Timeline: 2-4 weeks**
