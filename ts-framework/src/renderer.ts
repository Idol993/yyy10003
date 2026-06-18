import {
  WasmBindgenModule, WasmRasterEngine, BlendMode, FrameStats,
  BenchmarkResult, RenderContext
} from './types';
import { initWasm, createEngine, createImageData, writeBytesToWasm, freeWasmBytes, getWasmMemory } from './wasm-bridge';
import { MatrixStack } from './matrix';
import { Camera2D } from './camera';
import { SceneTree } from './scene';
import { Primitives } from './primitives';
import { LayerManager } from './layer';
import { FontLoader } from './font-loader';
import { FrameScheduler } from './scheduler';

export class RasterRenderer {
  private wasmModule!: WasmBindgenModule;
  private engine!: WasmRasterEngine;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private matrixStack: MatrixStack;
  private camera: Camera2D;
  private scene: SceneTree;
  private primitives!: Primitives;
  private layerManager!: LayerManager;
  private fontLoader!: FontLoader;
  private scheduler: FrameScheduler;
  private baseWidth: number;
  private baseHeight: number;
  private currentWidth: number;
  private currentHeight: number;
  private drawCalls: number = 0;
  private imageData: ImageData | null = null;
  private imageBufferPtr: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;

    this.baseWidth = canvas.width;
    this.baseHeight = canvas.height;
    this.currentWidth = canvas.width;
    this.currentHeight = canvas.height;

    this.matrixStack = new MatrixStack();
    this.camera = new Camera2D({
      x: 0, y: 0,
      width: this.baseWidth,
      height: this.baseHeight,
      zoom: 1, rotation: 0,
    });
    this.scene = new SceneTree();
    this.scheduler = new FrameScheduler();
  }

  async init(modulePath: string): Promise<void> {
    this.wasmModule = await initWasm(modulePath);
    this.engine = createEngine(this.currentWidth, this.currentHeight);
    this.primitives = new Primitives(this.engine, this.matrixStack);
    this.layerManager = new LayerManager(this.engine);
    this.fontLoader = new FontLoader(this.engine);
  }

  get width(): number { return this.currentWidth; }
  get height(): number { return this.currentHeight; }
  get prim(): Primitives { return this.primitives; }
  get layers(): LayerManager { return this.layerManager; }
  get fonts(): FontLoader { return this.fontLoader; }
  get cam(): Camera2D { return this.camera; }
  get sceneTree(): SceneTree { return this.scene; }
  get matStack(): MatrixStack { return this.matrixStack; }
  get engineRef(): WasmRasterEngine { return this.engine; }
  get frameScheduler(): FrameScheduler { return this.scheduler; }

  setBlendMode(mode: BlendMode): void {
    this.engine.set_blend_mode(mode);
  }

  getBlendMode(): BlendMode {
    return this.engine.get_blend_mode() as BlendMode;
  }

  clear(r: number = 0, g: number = 0, b: number = 0, a: number = 1): void {
    this.engine.clear(r, g, b, a);
    this.drawCalls = 0;
  }

  resize(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;
    this.engine.resize(width, height);
    this.camera.setViewport(width, height);
    this.imageData = null;
  }

  setResolutionScale(scale: number): void {
    const w = Math.max(1, Math.floor(this.baseWidth * scale));
    const h = Math.max(1, Math.floor(this.baseHeight * scale));
    if (w !== this.currentWidth || h !== this.currentHeight) {
      this.resize(w, h);
    }
  }

  present(): void {
    try {
      this.imageData = createImageData(this.engine);
      this.ctx.canvas.width = this.baseWidth;
      this.ctx.canvas.height = this.baseHeight;

      if (this.currentWidth !== this.baseWidth || this.currentHeight !== this.baseHeight) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.currentWidth;
        tempCanvas.height = this.currentHeight;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(this.imageData, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.drawImage(tempCanvas, 0, 0, this.baseWidth, this.baseHeight);
      } else {
        this.ctx.putImageData(this.imageData, 0, 0);
      }
    } catch (e) {
      this.imageData = null;
      this.recreateImageData();
    }
  }

  private recreateImageData(): void {
    try {
      this.imageData = createImageData(this.engine);
    } catch {
      // Wasm memory may have been reallocated, recreate next frame
    }
  }

  createTexture(width: number, height: number, data: Uint8Array): number {
    const { ptr, len } = writeBytesToWasm(this.engine, data);
    const id = this.engine.create_texture(width, height, ptr, len);
    freeWasmBytes(this.engine, ptr, len);
    return id;
  }

  destroyTexture(id: number): void {
    this.engine.free_texture(id);
  }

  renderScene(): void {
    const renderCtx: RenderContext = {
      renderer: this,
      matrixStack: [],
      currentBlend: BlendMode.AlphaBlend,
    };
    this.scene.render(renderCtx, this.matrixStack);
  }

  startLoop(
    updateFn: (dt: number) => void,
    renderFn: (renderer: RasterRenderer) => void,
    statsCallback?: (stats: FrameStats) => void
  ): void {
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

  stopLoop(): void {
    this.scheduler.stop();
  }

  getMemoryUsage(): number {
    let memSize = this.currentWidth * this.currentHeight * 4;
    try {
      const mem = getWasmMemory();
      if (mem && mem.buffer) {
        memSize += mem.buffer.byteLength;
      }
    } catch {
    }
    return memSize;
  }

  benchmarkTriangles(count: number, size: number): number {
    return this.engine.benchmark_triangles(count, size);
  }

  benchmarkCircles(count: number, radius: number): number {
    return this.engine.benchmark_circles(count, radius);
  }

  benchmarkPolygons(count: number, sides: number, radius: number): number {
    return this.engine.benchmark_polygons(count, sides, radius);
  }

  runBenchmark(primitiveType: string, counts: number[]): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    for (const count of counts) {
      this.engine.clear(0, 0, 0, 1);

      let frameTime: number;
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

  incrementDrawCalls(): void {
    this.drawCalls++;
  }
}
