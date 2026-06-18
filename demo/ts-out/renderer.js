import { BlendMode } from './types.js';
import { initWasm, createEngine, createImageData, writeBytesToWasm, freeWasmBytes, getWasmMemory } from './wasm-bridge.js';
import { MatrixStack } from './matrix.js';
import { Camera2D } from './camera.js';
import { SceneTree } from './scene.js';
import { Primitives } from './primitives.js';
import { LayerManager } from './layer.js';
import { FontLoader } from './font-loader.js';
import { FrameScheduler } from './scheduler.js';
export class RasterRenderer {
    constructor(canvas) {
        this.drawCalls = 0;
        this.imageData = null;
        this.imageBufferPtr = 0;
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Cannot get 2d context');
        this.ctx = ctx;
        this.baseWidth = canvas.width;
        this.baseHeight = canvas.height;
        this.currentWidth = canvas.width;
        this.currentHeight = canvas.height;
        this.matrixStack = new MatrixStack();
        this.camera = new Camera2D({
            x: 0, y: 0, width: this.baseWidth, height: this.baseHeight, zoom: 1, rotation: 0,
        });
        this.scene = new SceneTree();
        this.scheduler = new FrameScheduler();
    }
    async init(modulePath) {
        this.wasmModule = await initWasm(modulePath);
        this.engine = createEngine(this.currentWidth, this.currentHeight);
        this.primitives = new Primitives(this.engine, this.matrixStack);
        this.layerManager = new LayerManager(this.engine);
        this.fontLoader = new FontLoader(this.engine);
    }
    get width() { return this.currentWidth; }
    get height() { return this.currentHeight; }
    get prim() { return this.primitives; }
    get layers() { return this.layerManager; }
    get fonts() { return this.fontLoader; }
    get cam() { return this.camera; }
    get sceneTree() { return this.scene; }
    get matStack() { return this.matrixStack; }
    get engineRef() { return this.engine; }
    get frameScheduler() { return this.scheduler; }
    setBlendMode(mode) { this.engine.set_blend_mode(mode); }
    getBlendMode() { return this.engine.get_blend_mode(); }
    clear(r = 0, g = 0, b = 0, a = 1) {
        this.engine.clear(r, g, b, a);
        this.drawCalls = 0;
    }
    resize(width, height) {
        this.currentWidth = width;
        this.currentHeight = height;
        this.engine.resize(width, height);
        this.camera.setViewport(width, height);
        this.imageData = null;
    }
    setResolutionScale(scale) {
        const w = Math.max(1, Math.floor(this.baseWidth * scale));
        const h = Math.max(1, Math.floor(this.baseHeight * scale));
        if (w !== this.currentWidth || h !== this.currentHeight) {
            this.resize(w, h);
        }
    }
    present() {
        try {
            this.imageData = createImageData(this.engine);
            this.ctx.canvas.width = this.baseWidth;
            this.ctx.canvas.height = this.baseHeight;
            if (this.currentWidth !== this.baseWidth || this.currentHeight !== this.baseHeight) {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.currentWidth;
                tempCanvas.height = this.currentHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(this.imageData, 0, 0);
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.drawImage(tempCanvas, 0, 0, this.baseWidth, this.baseHeight);
            }
            else {
                this.ctx.putImageData(this.imageData, 0, 0);
            }
        }
        catch (e) {
            this.imageData = null;
            this.recreateImageData();
        }
    }
    recreateImageData() {
        try {
            this.imageData = createImageData(this.engine);
        }
        catch { }
    }
    createTexture(width, height, data) {
        const { ptr, len } = writeBytesToWasm(this.engine, data);
        const id = this.engine.create_texture(width, height, ptr, len);
        freeWasmBytes(this.engine, ptr, len);
        return id;
    }
    destroyTexture(id) { this.engine.free_texture(id); }
    renderScene() {
        const renderCtx = {
            renderer: this,
            matrixStack: [],
            currentBlend: BlendMode.AlphaBlend,
        };
        this.scene.render(renderCtx, this.matrixStack);
    }
    startLoop(updateFn, renderFn, statsCallback) {
        this.scheduler.setFrameCallback((dt, scale) => {
            this.setResolutionScale(scale);
            updateFn(dt);
            renderFn(this);
            this.present();
            return {
                frameTime: dt,
                drawCalls: this.drawCalls,
                pixelCount: this.currentWidth * this.currentHeight,
                resolution: { width: this.currentWidth, height: this.currentHeight },
                memoryUsage: this.getMemoryUsage(),
            };
        });
        if (statsCallback) {
            this.scheduler.setStatsCallback(statsCallback);
        }
        this.scheduler.start();
    }
    stopLoop() { this.scheduler.stop(); }
    getMemoryUsage() {
        let memSize = this.currentWidth * this.currentHeight * 4;
        try {
            const mem = getWasmMemory();
            if (mem && mem.buffer) {
                memSize += mem.buffer.byteLength;
            }
        }
        catch { }
        return memSize;
    }
    benchmarkTriangles(count, size) { return this.engine.benchmark_triangles(count, size); }
    benchmarkCircles(count, radius) { return this.engine.benchmark_circles(count, radius); }
    benchmarkPolygons(count, sides, radius) { return this.engine.benchmark_polygons(count, sides, radius); }
    runBenchmark(primitiveType, counts) {
        const results = [];
        for (const count of counts) {
            this.engine.clear(0, 0, 0, 1);
            let frameTime;
            switch (primitiveType) {
                case 'triangles':
                    frameTime = this.engine.benchmark_triangles(count, 30);
                    break;
                case 'circles':
                    frameTime = this.engine.benchmark_circles(count, 20);
                    break;
                case 'polygons':
                    frameTime = this.engine.benchmark_polygons(count, 6, 25);
                    break;
                default:
                    frameTime = this.engine.benchmark_triangles(count, 30);
            }
            results.push({
                primitiveCount: count,
                frameTime,
                memoryUsage: this.getMemoryUsage(),
                primitiveType,
            });
        }
        return results;
    }
    incrementDrawCalls() { this.drawCalls++; }
}
//# sourceMappingURL=renderer.js.map
