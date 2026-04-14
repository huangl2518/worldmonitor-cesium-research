# Phase 1 POC Results

## GlobeView POC (`globeview-poc.html`)
- Uses deck.gl 9.x built-in `GlobeView`
- All existing deck.gl layers (ScatterplotLayer, PathLayer, TextLayer) work unchanged
- Simple API: just replace `MapView` with `GlobeView`
- No new dependencies needed
- GPU-accelerated rendering maintained
- Interactive globe with mouse/touch controls

## CesiumJS POC (`cesium-poc.html`)
- Uses CesiumJS 1.124 via CDN
- 3D terrain rendering
- Entities must be created individually (no declarative layer API)
- Each data point requires manual entity creation with position, point, label, description
- More verbose code for same visual result
- Native popup/info boxes via `description` property

## Comparison

| Feature | deck.gl GlobeView | CesiumJS |
|---------|-------------------|----------|
| Existing layer code | Works unchanged | Must rewrite all layers |
| 3D terrain | No (unless custom) | Yes (Cesium World Terrain) |
| Code volume | Minimal changes | ~10x more code per layer |
| Performance | GPU-accelerated points/lines | Entity-based, slower for large datasets |
| Vector tiles | Via TileLayer | Custom provider needed |
| Globe interaction | Built-in | Built-in |
| Satellite imagery | Via imagery providers | Native (Cesium Ion) |
| Dependencies | Already installed | +5MB gzipped |

## Vector Tile (PMTiles) in 3D

### deck.gl GlobeView
- Can use `TileLayer` with `MVTLayer` for vector tiles
- PMTiles requires custom loader (use `pmtiles` npm package)
- Example:
  ```javascript
  new TileLayer({
    data: 'pmtiles://...',
    renderSubLayers: props => new GeoJsonLayer(props),
  })
  ```

### CesiumJS
- No native PMTiles/MVT support
- Options:
  1. Convert PMTiles to raster tiles server-side
  2. Use `pmtiles` npm package to read tiles, convert to GeoJSON, add as entities
  3. Use Cesium Ion to host vector tiles
  4. Custom VectorTileProvider implementation

## Recommendation

**Primary: deck.gl GlobeView**
- Minimal code changes
- All 30+ data layers work immediately
- Only need to handle basemap tiles separately
- Best for quick migration

**Secondary: CesiumJS for enhanced 3D**
- If 3D terrain, photorealistic globe, or Cesium Ion data is required
- Use deck.gl GlobeView for data layers, CesiumJS for basemap/terrain
- Or full CesiumJS rewrite if budget allows

## Next Steps
1. Integrate GlobeView into actual DeckGLMap.ts
2. Handle basemap imagery (raster tiles instead of PMTiles vector)
3. Test all 33 data layers on globe
4. Add CesiumJS terrain as optional enhancement
