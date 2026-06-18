import { WasmRasterEngine, BlendMode, TriangleVertex, RenderContext } from './types';
import { MatrixStack } from './matrix';
import { writeFloatArrayToWasm, freeWasmBytes } from './wasm-bridge';

export class Primitives {
  private engine: WasmRasterEngine;
  private matrixStack: MatrixStack;

  constructor(engine: WasmRasterEngine, matrixStack: MatrixStack) {
    this.engine = engine;
    this.matrixStack = matrixStack;
  }

  fillRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    const p = this.matrixStack.transformPoint(x, y);
    const pw = this.matrixStack.transformPoint(x + w, y + h);
    this.engine.draw_rect(p.x, p.y, pw.x - p.x, pw.y - p.y, r, g, b, a);
  }

  strokeRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number, lineWidth: number): void {
    const p = this.matrixStack.transformPoint(x, y);
    const pw = this.matrixStack.transformPoint(x + w, y + h);
    this.engine.draw_rect_stroke(p.x, p.y, pw.x - p.x, pw.y - p.y, r, g, b, a, lineWidth);
  }

  fillCircle(cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number, msaa: boolean = true): void {
    const p = this.matrixStack.transformPoint(cx, cy);
    this.engine.draw_circle(p.x, p.y, radius, r, g, b, a, msaa);
  }

  strokeCircle(cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number, lineWidth: number, msaa: boolean = true): void {
    const p = this.matrixStack.transformPoint(cx, cy);
    this.engine.draw_circle_stroke(p.x, p.y, radius, r, g, b, a, lineWidth, msaa);
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, a: number, lineWidth: number): void {
    const p0 = this.matrixStack.transformPoint(x0, y0);
    const p1 = this.matrixStack.transformPoint(x1, y1);
    this.engine.draw_line(p0.x, p0.y, p1.x, p1.y, r, g, b, a, lineWidth);
  }

  drawQuadBezier(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    r: number, g: number, b: number, a: number,
    lineWidth: number, steps: number = 16
  ): void {
    const p0 = this.matrixStack.transformPoint(x0, y0);
    const p1 = this.matrixStack.transformPoint(x1, y1);
    const p2 = this.matrixStack.transformPoint(x2, y2);
    this.engine.draw_quad_bezier(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, r, g, b, a, lineWidth, steps);
  }

  drawCubicBezier(
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    r: number, g: number, b: number, a: number,
    lineWidth: number, steps: number = 20
  ): void {
    const p0 = this.matrixStack.transformPoint(x0, y0);
    const p1 = this.matrixStack.transformPoint(x1, y1);
    const p2 = this.matrixStack.transformPoint(x2, y2);
    const p3 = this.matrixStack.transformPoint(x3, y3);
    this.engine.draw_cubic_bezier(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, r, g, b, a, lineWidth, steps);
  }

  fillPolygon(points: Array<{ x: number; y: number }>, r: number, g: number, b: number, a: number, msaa: boolean = true): void {
    const transformed = points.map(p => this.matrixStack.transformPoint(p.x, p.y));
    const flat = new Float32Array(transformed.length * 2);
    for (let i = 0; i < transformed.length; i++) {
      flat[i * 2] = transformed[i].x;
      flat[i * 2 + 1] = transformed[i].y;
    }
    const { ptr, len } = writeFloatArrayToWasm(this.engine, flat);
    this.engine.draw_polygon(ptr, len, r, g, b, a, msaa);
    freeWasmBytes(this.engine, ptr, flat.byteLength);
  }

  fillTriangle(
    v0: TriangleVertex, v1: TriangleVertex, v2: TriangleVertex,
    r: number, g: number, b: number, a: number,
    useTexture: boolean = false, textureId: number = 0,
    usePerspective: boolean = false, msaa: boolean = true
  ): void {
    const p0 = this.matrixStack.transformPoint(v0.x, v0.y);
    const p1 = this.matrixStack.transformPoint(v1.x, v1.y);
    const p2 = this.matrixStack.transformPoint(v2.x, v2.y);
    this.engine.draw_triangle_filled(
      p0.x, p0.y, v0.u, v0.v, v0.w,
      p1.x, p1.y, v1.u, v1.v, v1.w,
      p2.x, p2.y, v2.u, v2.v, v2.w,
      r, g, b, a,
      useTexture, textureId, usePerspective, msaa
    );
  }
}
