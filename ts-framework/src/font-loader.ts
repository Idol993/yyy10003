import { WasmRasterEngine, FontInfo } from './types';
import { writeBytesToWasm, freeWasmBytes } from './wasm-bridge';

export class FontLoader {
  private engine: WasmRasterEngine;
  private fonts: Map<number, FontInfo> = new Map();

  constructor(engine: WasmRasterEngine) {
    this.engine = engine;
  }

  async loadFromUrl(url: string, size: number = 16): Promise<number> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    return this.loadFromData(data, size);
  }

  loadFromData(data: Uint8Array, size: number = 16): number {
    const { ptr, len } = writeBytesToWasm(this.engine, data);
    const fontId = this.engine.load_font(ptr, len);
    freeWasmBytes(this.engine, ptr, len);

    if (fontId > 0) {
      this.engine.set_font_size(fontId, size);
      this.fonts.set(fontId, { id: fontId, size });
    }
    return fontId;
  }

  setSize(fontId: number, size: number): void {
    this.engine.set_font_size(fontId, size);
    const info = this.fonts.get(fontId);
    if (info) info.size = size;
  }

  drawText(fontId: number, text: string, x: number, y: number, r: number, g: number, b: number, a: number): number {
    return this.engine.draw_text(fontId, text, x, y, r, g, b, a);
  }

  measureText(fontId: number, text: string): number {
    return this.engine.measure_text(fontId, text);
  }

  getLineHeight(fontId: number): number {
    return this.engine.get_font_line_height(fontId);
  }

  getInfo(fontId: number): FontInfo | undefined {
    return this.fonts.get(fontId);
  }
}
