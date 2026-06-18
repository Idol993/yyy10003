export enum BlendMode {
  AlphaBlend = 0,
  Additive = 1,
  Multiply = 2,
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TriangleVertex {
  x: number;
  y: number;
  u: number;
  v: number;
  w: number;
}

export interface TextureInfo {
  id: number;
  width: number;
  height: number;
}

export interface LayerInfo {
  id: number;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  clip: Rect | null;
}

export interface FontInfo {
  id: number;
  size: number;
}

export interface SceneNode {
  id: number;
  parent: SceneNode | null;
  children: SceneNode[];
  transform: Mat4;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  draw: (ctx: RenderContext) => void;
}

export interface RenderContext {
  renderer: RasterRenderer;
  matrixStack: Mat4[];
  currentBlend: BlendMode;
}

export interface CameraConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  rotation: number;
}

export interface FrameStats {
  frameTime: number;
  drawCalls: number;
  pixelCount: number;
  resolution: { width: number; height: number };
  memoryUsage: number;
}

export interface BenchmarkResult {
  primitiveCount: number;
  frameTime: number;
  memoryUsage: number;
  primitiveType: string;
}

export interface WasmBindgenModule {
  default: () => Promise<void> | void;
  RasterEngine: new (width: number, height: number) => WasmRasterEngine;
  memory?: WebAssembly.Memory;
  wasm_memory?: WebAssembly.Memory;
}

export interface WasmExports {
  RasterEngine: new (width: number, height: number) => WasmRasterEngine;
  memory: WebAssembly.Memory;
}

export interface WasmRasterEngine {
  resize(width: number, height: number): void;
  get_buffer_ptr(): number;
  get_buffer_len(): number;
  get_width(): number;
  get_height(): number;
  clear(r: number, g: number, b: number, a: number): void;
  set_blend_mode(mode: number): void;
  get_blend_mode(): number;
  draw_triangle_filled(
    x0: number, y0: number, u0: number, v0: number, w0: number,
    x1: number, y1: number, u1: number, v1: number, w1: number,
    x2: number, y2: number, u2: number, v2: number, w2: number,
    r: number, g: number, b: number, a: number,
    use_texture: boolean, texture_id: number,
    use_perspective: boolean, msaa: boolean
  ): void;
  draw_rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void;
  draw_rect_stroke(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, line_width: number): void;
  draw_circle(cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number, msaa: boolean): void;
  draw_circle_stroke(cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number, line_width: number, msaa: boolean): void;
  draw_line(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, a: number, line_width: number): void;
  draw_quad_bezier(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number, line_width: number, steps: number): void;
  draw_cubic_bezier(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, r: number, g: number, b: number, a: number, line_width: number, steps: number): void;
  draw_polygon(points_ptr: number, points_len: number, r: number, g: number, b: number, a: number, msaa: boolean): void;
  create_texture(width: number, height: number, data_ptr: number, data_len: number): number;
  free_texture(id: number): void;
  create_layer(): number;
  set_active_layer(id: number): void;
  get_active_layer(): number;
  set_layer_blend_mode(id: number, mode: number): void;
  set_layer_opacity(id: number, opacity: number): void;
  set_layer_visible(id: number, visible: boolean): void;
  set_layer_clip(id: number, x: number, y: number, w: number, h: number): void;
  clear_layer_clip(id: number): void;
  clear_layer(id: number, r: number, g: number, b: number, a: number): void;
  composite_layer_to_main(id: number): void;
  composite_all_layers(): void;
  free_layer(id: number): void;
  load_font(data_ptr: number, data_len: number): number;
  set_font_size(font_id: number, size_px: number): void;
  draw_text(font_id: number, text: string, x: number, y: number, r: number, g: number, b: number, a: number): number;
  measure_text(font_id: number, text: string): number;
  get_font_line_height(font_id: number): number;
  get_layer_ptr(id: number): number;
  get_layer_len(id: number): number;
  benchmark_triangles(count: number, size: number): number;
  benchmark_circles(count: number, radius: number): number;
  benchmark_polygons(count: number, sides: number, radius: number): number;
  malloc(size: number): number;
  free(ptr: number, size: number): void;
}

export type Mat4 = Float64Array;
