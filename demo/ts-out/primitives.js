import { MatrixStack } from './matrix.js';
import { writeFloatArrayToWasm, freeWasmBytes } from './wasm-bridge.js';
export class Primitives {
    constructor(engine, matrixStack) {
        this.engine = engine;
        this.matrixStack = matrixStack;
    }
    fillRect(x, y, w, h, r, g, b, a) {
        const p1 = this.matrixStack.transformPoint(x, y);
        const p2 = this.matrixStack.transformPoint(x + w, y);
        const p3 = this.matrixStack.transformPoint(x + w, y + h);
        const p4 = this.matrixStack.transformPoint(x, y + h);
        this.engine.draw_triangle_filled(p1.x, p1.y, 0, 0, 1, p2.x, p2.y, 1, 0, 1, p3.x, p3.y, 1, 1, 1, r, g, b, a, false, 0, false, false);
        this.engine.draw_triangle_filled(p1.x, p1.y, 0, 0, 1, p3.x, p3.y, 1, 1, 1, p4.x, p4.y, 0, 1, 1, r, g, b, a, false, 0, false, false);
    }
    fillCircle(cx, cy, radius, r, g, b, a, msaa = true) {
        const c = this.matrixStack.transformPoint(cx, cy);
        const sx = Math.abs(this.matrixStack.transformPoint(cx + radius, cy).x - c.x);
        this.engine.draw_circle(c.x, c.y, sx, r, g, b, a, msaa);
    }
    drawLine(x0, y0, x1, y1, r, g, b, a, lineWidth = 1) {
        const p0 = this.matrixStack.transformPoint(x0, y0);
        const p1 = this.matrixStack.transformPoint(x1, y1);
        this.engine.draw_line(p0.x, p0.y, p1.x, p1.y, r, g, b, a, lineWidth);
    }
    drawQuadBezier(x0, y0, x1, y1, x2, y2, r, g, b, a, lineWidth = 1, steps = 10) {
        const p0 = this.matrixStack.transformPoint(x0, y0);
        const c = this.matrixStack.transformPoint(x1, y1);
        const p1 = this.matrixStack.transformPoint(x2, y2);
        this.engine.draw_quad_bezier(p0.x, p0.y, c.x, c.y, p1.x, p1.y, r, g, b, a, lineWidth, steps);
    }
    drawCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, r, g, b, a, lineWidth = 1, steps = 20) {
        const p0 = this.matrixStack.transformPoint(x0, y0);
        const c0 = this.matrixStack.transformPoint(x1, y1);
        const c1 = this.matrixStack.transformPoint(x2, y2);
        const p1 = this.matrixStack.transformPoint(x3, y3);
        this.engine.draw_cubic_bezier(p0.x, p0.y, c0.x, c0.y, c1.x, c1.y, p1.x, p1.y, r, g, b, a, lineWidth, steps);
    }
    fillTriangle(v0, v1, v2, r, g, b, a, useTexture = false, textureId = 0, usePerspective = false, msaa = false) {
        const t0 = this.matrixStack.transformPoint(v0.x, v0.y);
        const t1 = this.matrixStack.transformPoint(v1.x, v1.y);
        const t2 = this.matrixStack.transformPoint(v2.x, v2.y);
        this.engine.draw_triangle_filled(t0.x, t0.y, v0.u, v0.v, v0.w, t1.x, t1.y, v1.u, v1.v, v1.w, t2.x, t2.y, v2.u, v2.v, v2.w, r, g, b, a, useTexture, textureId, usePerspective, msaa);
    }
    fillPolygon(points, r, g, b, a, msaa = true) {
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
}
//# sourceMappingURL=primitives.js.map
