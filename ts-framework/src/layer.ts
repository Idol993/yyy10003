import { WasmRasterEngine, BlendMode, LayerInfo } from './types';

export class LayerManager {
  private engine: WasmRasterEngine;
  private layers: Map<number, LayerInfo> = new Map();
  private activeLayerId: number = 0;

  constructor(engine: WasmRasterEngine) {
    this.engine = engine;
  }

  createLayer(blendMode: BlendMode = BlendMode.AlphaBlend, opacity: number = 1.0): number {
    const id = this.engine.create_layer();
    this.engine.set_layer_blend_mode(id, blendMode);
    this.engine.set_layer_opacity(id, opacity);
    this.layers.set(id, {
      id,
      visible: true,
      opacity,
      blendMode,
      clip: null,
    });
    return id;
  }

  setActive(id: number): void {
    this.engine.set_active_layer(id);
    this.activeLayerId = id;
  }

  getActive(): number {
    return this.activeLayerId;
  }

  resetToMain(): void {
    this.engine.set_active_layer(0);
    this.activeLayerId = 0;
  }

  setBlendMode(id: number, mode: BlendMode): void {
    this.engine.set_layer_blend_mode(id, mode);
    const info = this.layers.get(id);
    if (info) info.blendMode = mode;
  }

  setOpacity(id: number, opacity: number): void {
    this.engine.set_layer_opacity(id, opacity);
    const info = this.layers.get(id);
    if (info) info.opacity = opacity;
  }

  setVisible(id: number, visible: boolean): void {
    this.engine.set_layer_visible(id, visible);
    const info = this.layers.get(id);
    if (info) info.visible = visible;
  }

  setClip(id: number, x: number, y: number, w: number, h: number): void {
    this.engine.set_layer_clip(id, x, y, w, h);
    const info = this.layers.get(id);
    if (info) info.clip = { x, y, width: w, height: h };
  }

  clearClip(id: number): void {
    this.engine.clear_layer_clip(id);
    const info = this.layers.get(id);
    if (info) info.clip = null;
  }

  clear(id: number, r: number, g: number, b: number, a: number): void {
    this.engine.clear_layer(id, r, g, b, a);
  }

  compositeToMain(id: number): void {
    this.engine.composite_layer_to_main(id);
  }

  compositeAll(): void {
    const sortedIds = Array.from(this.layers.keys()).sort((a, b) => a - b);
    for (const id of sortedIds) {
      this.engine.composite_layer_to_main(id);
    }
  }

  free(id: number): void {
    this.engine.free_layer(id);
    this.layers.delete(id);
    if (this.activeLayerId === id) {
      this.activeLayerId = 0;
    }
  }

  getInfo(id: number): LayerInfo | undefined {
    return this.layers.get(id);
  }

  getAllLayers(): LayerInfo[] {
    return Array.from(this.layers.values());
  }
}
