/**
 * CesiumMap — GlobeView-based replacement for DeckGLMap
 *
 * Migration approach: Replace MapLibre + MapboxOverlay with deck.gl GlobeView
 *
 * Key changes from DeckGLMap.ts:
 * 1. Remove MapLibre GL dependency
 * 2. Replace MapboxOverlay with direct DeckGL instance using GlobeView
 * 3. Replace PMTiles basemap with raster imagery provider
 * 4. All deck.gl layers (ScatterplotLayer, PathLayer, etc.) work unchanged
 *
 * This file demonstrates the minimal changes needed for the migration.
 */

import { DeckGL, GlobeView } from '@deck.gl/core';
import { ScatterplotLayer, PathLayer, GeoJsonLayer, IconLayer, TextLayer, PolygonLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';

// ============================================================
// Basemap: Raster imagery for GlobeView
// ============================================================

/**
 * GlobeView doesn't use MapLibre, so we need a different basemap approach.
 *
 * Options:
 * 1. Use deck.gl's BitmapLayer with raster tile URLs
 * 2. Use TileLayer with raster imagery providers
 * 3. Use Cesium Ion imagery (requires CesiumJS dependency)
 * 4. Dark globe without basemap (simplest, matches dark theme)
 */

// Simple dark basemap using TileLayer with OpenStreetMap raster tiles
function createBasemapLayer(theme: 'dark' | 'light' = 'dark') {
  // OpenFreeMap raster tiles (free, no API key)
  const tileUrl = theme === 'dark'
    ? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  return new TileLayer({
    id: 'basemap',
    data: tileUrl,
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: props => {
      const { bbox } = props.tile;
      return new BitmapLayer(props, {
        data: null,
        image: props.data,
        bounds: [bbox.west, bbox.south, bbox.east, bbox.north],
      });
    },
  });
}

// Alternative: Use a single solid-color background (no tiles)
// This is the simplest approach and works well for dark themes
function createDarkGlobeBackground() {
  return new PolygonLayer({
    id: 'globe-background',
    data: [
      [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]
    ],
    getPolygon: d => d,
    getFillColor: [10, 15, 25, 255],
    stroked: false,
  });
}

// ============================================================
// CesiumMap Class
// ============================================================

export interface CesiumMapProps {
  container: HTMLElement;
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  layers?: any[];
  onViewStateChange?: (viewState: any) => void;
  getTooltip?: (info: any) => any;
  theme?: 'dark' | 'light';
}

export class CesiumMap {
  private deckgl: DeckGL;
  private currentLayers: any[] = [];

  constructor(props: CesiumMapProps) {
    this.deckgl = new DeckGL({
      container: props.container,
      views: new GlobeView(),
      initialViewState: props.initialViewState ?? {
        latitude: 20,
        longitude: 10,
        zoom: 1.5,
        minZoom: 0,
        maxZoom: 20,
      },
      controller: true,
      layers: [],
      getTooltip: props.getTooltip,
      pickingRadius: 10,
    });
  }

  /**
   * Set layers — same API as DeckGLMap
   * All deck.gl layer types work unchanged with GlobeView
   */
  setLayers(layers: any[]) {
    this.currentLayers = layers;
    this.deckgl.setProps({ layers });
  }

  /**
   * Update view state (fly to location)
   */
  setViewState(viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
    transitionDuration?: number;
  }) {
    this.deckgl.setProps({
      initialViewState: viewState,
    });
  }

  /**
   * Destroy the map
   */
  destroy() {
    this.deckgl.finalize();
  }
}

// ============================================================
// Migration guide: What changes in DeckGLMap.ts
// ============================================================

/**
 * BEFORE (MapLibre + MapboxOverlay):
 * ```typescript
 * import { MapboxOverlay } from '@deck.gl/mapbox';
 * import maplibregl from 'maplibre-gl';
 *
 * this.maplibreMap = new maplibregl.Map({ ... });
 * this.deckOverlay = new MapboxOverlay({ layers: [...] });
 * this.maplibreMap.addControl(this.deckOverlay);
 * ```
 *
 * AFTER (GlobeView):
 * ```typescript
 * import { DeckGL, GlobeView } from '@deck.gl/core';
 *
 * this.deckgl = new DeckGL({
 *   container: this.container,
 *   views: new GlobeView(),
 *   initialViewState: { ... },
 *   controller: true,
 *   layers: [...],
 * });
 * ```
 *
 * LAYER CODE: No changes needed!
 * - ScatterplotLayer, PathLayer, GeoJsonLayer, etc. all work the same
 * - getPosition, getFillColor, getRadius, etc. all work the same
 * - pickable, onClick, onHover all work the same
 *
 * WHAT CHANGES:
 * 1. Remove MapLibre map initialization
 * 2. Replace MapboxOverlay with direct DeckGL instance using GlobeView
 * 3. Replace PMTiles basemap with raster imagery or solid background
 * 4. Popup/tooltip positioning may need adjustment (no map container offset)
 *
 * WHAT STAYS THE SAME:
 * - All ~30 data layer definitions
 * - Data fetching and state management
 * - Layer toggle controls
 * - Popup/tooltip content
 * - Service integrations
 */
