/**
 * GlobeMapView — 3D Globe replacement for DeckGLMap
 *
 * This component replaces MapLibre GL + MapboxOverlay with deck.gl GlobeView.
 * All deck.gl layers work unchanged.
 *
 * Architecture:
 *   BEFORE: DeckGLMap → MapLibre (2D) → MapboxOverlay → deck.gl layers
 *   AFTER:  GlobeMapView → DeckGL (GlobeView) → deck.gl layers (same!)
 *
 * Key differences from DeckGLMap:
 * 1. No MapLibre dependency
 * 2. No PMTiles protocol (use raster tiles or solid background)
 * 3. Direct DeckGL instance with GlobeView
 * 4. All layer code (buildLayers) remains identical
 */

import { DeckGL, GlobeView } from '@deck.gl/core';
import type { PickingInfo } from '@deck.gl/core';
import { ScatterplotLayer, PathLayer, GeoJsonLayer, IconLayer, TextLayer, PolygonLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';

// Re-export the same imports as DeckGLMap so buildLayers() works
export {
  ScatterplotLayer, PathLayer, GeoJsonLayer, IconLayer,
  TextLayer, PolygonLayer,
};

// ============================================================
// GlobeMapView Configuration
// ============================================================

export interface GlobeMapViewConfig {
  container: HTMLElement;
  initialViewState?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  onLayersReady?: () => void;
  onError?: (error: Error) => void;
  basemap?: 'none' | 'raster' | 'dark';
  basemapUrl?: string;
}

const DEFAULT_VIEW_STATE = {
  latitude: 20,
  longitude: 10,
  zoom: 1.5,
};

// ============================================================
// GlobeMapView Class
// ============================================================

export class GlobeMapView {
  private deckgl: DeckGL | null = null;
  private container: HTMLElement;
  private config: GlobeMapViewConfig;
  private currentLayers: any[] = [];
  private basemapLayer: any = null;

  constructor(config: GlobeMapViewConfig) {
    this.container = config.container;
    this.config = config;
    this.init();
  }

  private init(): void {
    const vs = this.config.initialViewState ?? DEFAULT_VIEW_STATE;

    this.deckgl = new DeckGL({
      container: this.container,
      views: new GlobeView(),
      initialViewState: {
        latitude: vs.latitude,
        longitude: vs.longitude,
        zoom: vs.zoom,
        minZoom: 0,
        maxZoom: 20,
      },
      controller: true,
      layers: [],
      pickingRadius: 10,
      useDevicePixels: window.devicePixelRatio > 2 ? 2 : true,
      onError: (error: Error) => {
        console.warn('[GlobeMapView] Render error:', error.message);
        this.config.onError?.(error);
      },
    });

    // Create basemap layer
    this.basemapLayer = this.createBasemapLayer();

    this.config.onLayersReady?.();
  }

  /**
   * Create basemap layer for the globe
   *
   * Options:
   * - 'none': No basemap (dark globe background, best performance)
   * - 'dark': Dark colored globe (matches WorldMonitor dark theme)
   * - 'raster': OpenStreetMap raster tiles
   */
  private createBasemapLayer(): any {
    const mode = this.config.basemap ?? 'dark';

    if (mode === 'none') {
      return null;
    }

    if (mode === 'raster') {
      const url = this.config.basemapUrl ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      return new TileLayer({
        id: 'basemap-raster',
        data: url,
        minZoom: 0,
        maxZoom: 18,
        tileSize: 256,
        renderSubLayers: (props: any) => {
          const { bbox } = props.tile;
          if (!bbox || !props.data) return null;
          return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [bbox.west, bbox.south, bbox.east, bbox.north],
          });
        },
      });
    }

    // 'dark' mode: solid dark background polygon
    return new PolygonLayer({
      id: 'globe-dark-bg',
      data: [
        { polygon: [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]] }
      ],
      getPolygon: (d: any) => d.polygon,
      getFillColor: [8, 12, 22, 255],
      stroked: false,
      pickable: false,
    });
  }

  /**
   * Set data layers — same API as MapboxOverlay.setProps({ layers })
   * This is the key method that allows drop-in replacement
   */
  setLayers(layers: any[]): void {
    this.currentLayers = layers;
    const allLayers = this.basemapLayer
      ? [this.basemapLayer, ...layers]
      : layers;

    this.deckgl?.setProps({ layers: allLayers });
  }

  /**
   * Set view state with optional animation
   */
  setViewState(viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
    transitionDuration?: number;
  }): void {
    this.deckgl?.setProps({
      initialViewState: {
        latitude: viewState.latitude,
        longitude: viewState.longitude,
        zoom: viewState.zoom,
      },
    });
  }

  /**
   * Get current view state
   */
  getViewState(): { latitude: number; longitude: number; zoom: number } | null {
    // GlobeView doesn't expose view state directly
    // Would need to track via onViewStateChange callback
    return null;
  }

  /**
   * Set tooltip handler
   */
  setTooltipHandler(handler: (info: PickingInfo) => any): void {
    this.deckgl?.setProps({ getTooltip: handler });
  }

  /**
   * Set click handler
   */
  setClickHandler(handler: (info: PickingInfo) => void): void {
    this.deckgl?.setProps({ onClick: handler });
  }

  /**
   * Switch basemap mode
   */
  setBasemap(mode: 'none' | 'raster' | 'dark'): void {
    this.config.basemap = mode;
    this.basemapLayer = this.createBasemapLayer();
    this.setLayers(this.currentLayers);
  }

  /**
   * Destroy and clean up
   */
  finalize(): void {
    this.deckgl?.finalize();
    this.deckgl = null;
  }
}

// ============================================================
// Migration helper: Drop-in replacement for MapboxOverlay
// ============================================================

/**
 * This class mimics MapboxOverlay's API so DeckGLMap.ts can use it
 * with minimal changes.
 *
 * Usage in DeckGLMap.ts:
 *
 *   // BEFORE:
 *   this.deckOverlay = new MapboxOverlay({ interleaved: true, layers: [...] });
 *   this.maplibreMap.addControl(this.deckOverlay);
 *
 *   // AFTER:
 *   this.globeView = new GlobeMapOverlay({ container: this.container, ... });
 *   // No addControl needed — GlobeMapOverlay owns its own canvas
 *
 *   // Same API for updating layers:
 *   this.globeView.setProps({ layers: this.buildLayers() });
 */
export class GlobeMapOverlay {
  private globeView: GlobeMapView;

  constructor(props: {
    interleaved?: boolean;
    layers?: any[];
    getTooltip?: (info: PickingInfo) => any;
    onClick?: (info: PickingInfo) => void;
    pickingRadius?: number;
    useDevicePixels?: boolean | number;
    onError?: (error: Error) => void;
    // GlobeView specific
    container?: HTMLElement;
    basemap?: 'none' | 'raster' | 'dark';
  }) {
    // Container must be provided for GlobeView
    if (!props.container) {
      throw new Error('[GlobeMapOverlay] container is required for GlobeView');
    }

    this.globeView = new GlobeMapView({
      container: props.container,
      basemap: props.basemap ?? 'dark',
      onError: props.onError,
    });

    if (props.getTooltip) {
      this.globeView.setTooltipHandler(props.getTooltip);
    }
    if (props.onClick) {
      this.globeView.setClickHandler(props.onClick);
    }
    if (props.layers) {
      this.globeView.setLayers(props.layers);
    }
  }

  /**
   * Same API as MapboxOverlay.setProps()
   */
  setProps(props: { layers?: any[]; getTooltip?: any; onClick?: any }): void {
    if (props.layers) {
      this.globeView.setLayers(props.layers);
    }
    if (props.getTooltip) {
      this.globeView.setTooltipHandler(props.getTooltip);
    }
    if (props.onClick) {
      this.globeView.setClickHandler(props.onClick);
    }
  }

  /**
   * Same API as MapboxOverlay.finalize()
   */
  finalize(): void {
    this.globeView.finalize();
  }
}

// ============================================================
// Integration guide for DeckGLMap.ts
// ============================================================

/**
 * STEPS TO MIGRATE DeckGLMap.ts:
 *
 * 1. Replace imports:
 *    - REMOVE: import { MapboxOverlay } from '@deck.gl/mapbox';
 *    - REMOVE: import maplibregl from 'maplibre-gl';
 *    - ADD: import { GlobeMapOverlay } from './GlobeMapView';
 *
 * 2. Replace property type:
 *    - CHANGE: private deckOverlay: MapboxOverlay | null = null;
 *    - TO:     private deckOverlay: GlobeMapOverlay | null = null;
 *
 * 3. Replace initMapLibre() + initDeck() with:
 *    private initGlobe(): void {
 *      this.deckOverlay = new GlobeMapOverlay({
 *        container: this.container,
 *        basemap: 'dark',
 *        layers: this.buildLayers(),
 *        getTooltip: (info) => this.getTooltip(info),
 *        onClick: (info) => this.handleClick(info),
 *        pickingRadius: 10,
 *        onError: (error) => { ... },
 *      });
 *    }
 *
 * 4. Remove all maplibreMap references:
 *    - Remove maplibreMap.on('load', ...)
 *    - Remove maplibreMap.on('moveend', ...)
 *    - Remove maplibreMap.addControl(...)
 *    - Remove maplibreMap.getZoom(), getCenter(), etc.
 *
 * 5. Keep buildLayers() UNCHANGED — all layer code works as-is!
 *
 * 6. Keep layer state management UNCHANGED
 *
 * 7. Keep data fetching UNCHANGED
 *
 * 8. Keep popup/tooltip logic (adjust positioning if needed)
 */
