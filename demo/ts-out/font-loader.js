import { writeBytesToWasm, freeWasmBytes } from './wasm-bridge.js';
export class FontLoader {
    constructor(engine) {
        this.engine = engine;
        this.fonts = new Map();
    }
    async loadFromUrl(url, size = 16) {
        const response = await fetch(url);
        const data = new Uint8Array(await response.arrayBuffer());
        return this.loadFromData(data, size);
    }
    loadFromData(data, size = 16) {
        const { ptr, len } = writeBytesToWasm(this.engine, data);
        const fontId = this.engine.load_font(ptr, len);
        freeWasmBytes(this.engine, ptr, len);
        this.engine.set_font_size(fontId, size);
        this.fonts.set(fontId, { id: fontId, size });
        return fontId;
    }
    setFontSize(fontId, size) {
        this.engine.set_font_size(fontId, size);
        const f = this.fonts.get(fontId);
        if (f)
            f.size = size;
    }
    drawText(fontId, text, x, y, r, g, b, a) {
        return this.engine.draw_text(fontId, text, x, y, r, g, b, a);
    }
    measureText(fontId, text) {
        return this.engine.measure_text(fontId, text);
    }
    getLineHeight(fontId) {
        return this.engine.get_font_line_height(fontId);
    }
    getFontInfo(fontId) {
        return this.fonts.get(fontId) || null;
    }
}
//# sourceMappingURL=font-loader.js.map
