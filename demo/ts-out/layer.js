export class LayerManager {
    constructor(engine) {
        this.engine = engine;
        this.layers = new Map();
        this.nextId = 1;
    }
    createLayer() {
        const id = this.engine.create_layer();
        this.layers.set(id, { id, visible: true, opacity: 1.0, blendMode: 0, clip: null });
        return id;
    }
    setActiveLayer(id) { this.engine.set_active_layer(id); }
    getActiveLayer() { return this.engine.get_active_layer(); }
    setBlendMode(id, mode) {
        this.engine.set_layer_blend_mode(id, mode);
        const l = this.layers.get(id);
        if (l)
            l.blendMode = mode;
    }
    setOpacity(id, opacity) {
        this.engine.set_layer_opacity(id, opacity);
        const l = this.layers.get(id);
        if (l)
            l.opacity = opacity;
    }
    setVisible(id, visible) {
        this.engine.set_layer_visible(id, visible);
        const l = this.layers.get(id);
        if (l)
            l.visible = visible;
    }
    setClip(id, x, y, w, h) {
        this.engine.set_layer_clip(id, x, y, w, h);
        const l = this.layers.get(id);
        if (l)
            l.clip = { x, y, width: w, height: h };
    }
    clearClip(id) {
        this.engine.clear_layer_clip(id);
        const l = this.layers.get(id);
        if (l)
            l.clip = null;
    }
    clearLayer(id, r, g, b, a) {
        this.engine.clear_layer(id, r, g, b, a);
    }
    compositeLayer(id) {
        this.engine.composite_layer_to_main(id);
    }
    compositeAll() {
        this.engine.composite_all_layers();
    }
    destroyLayer(id) {
        this.engine.free_layer(id);
        this.layers.delete(id);
    }
    getLayerInfo(id) {
        return this.layers.get(id) || null;
    }
}
//# sourceMappingURL=layer.js.map
