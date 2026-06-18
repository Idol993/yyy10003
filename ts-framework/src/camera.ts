import { Mat4, CameraConfig } from './types';
import { mat4Create, mat4Ortho, mat4Translate, mat4Scale, mat4RotateZ, mat4Multiply, mat4Clone } from './matrix';

export class Camera2D {
  private config: CameraConfig;
  private viewMatrix: Mat4;
  private projMatrix: Mat4;
  private viewProjMatrix: Mat4;
  private dirty: boolean = true;

  constructor(config?: Partial<CameraConfig>) {
    this.config = {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      zoom: 1,
      rotation: 0,
      ...config,
    };
    this.viewMatrix = mat4Create();
    this.projMatrix = mat4Create();
    this.viewProjMatrix = mat4Create();
    this.updateMatrices();
  }

  get x(): number { return this.config.x; }
  get y(): number { return this.config.y; }
  get width(): number { return this.config.width; }
  get height(): number { return this.config.height; }
  get zoom(): number { return this.config.zoom; }
  get rotation(): number { return this.config.rotation; }

  set x(v: number) { this.config.x = v; this.dirty = true; }
  set y(v: number) { this.config.y = v; this.dirty = true; }
  set width(v: number) { this.config.width = v; this.dirty = true; }
  set height(v: number) { this.config.height = v; this.dirty = true; }
  set zoom(v: number) { this.config.zoom = v; this.dirty = true; }
  set rotation(v: number) { this.config.rotation = v; this.dirty = true; }

  setPosition(x: number, y: number): void {
    this.config.x = x;
    this.config.y = y;
    this.dirty = true;
  }

  setViewport(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.dirty = true;
  }

  pan(dx: number, dy: number): void {
    this.config.x -= dx / this.config.zoom;
    this.config.y -= dy / this.config.zoom;
    this.dirty = true;
  }

  zoomBy(factor: number, centerX: number, centerY: number): void {
    const oldZoom = this.config.zoom;
    this.config.zoom *= factor;
    this.config.zoom = Math.max(0.1, Math.min(100, this.config.zoom));
    const zoomRatio = this.config.zoom / oldZoom;
    this.config.x = centerX - (centerX - this.config.x) * zoomRatio;
    this.config.y = centerY - (centerY - this.config.y) * zoomRatio;
    this.dirty = true;
  }

  lookAt(x: number, y: number): void {
    this.config.x = x - this.config.width / (2 * this.config.zoom);
    this.config.y = y - this.config.height / (2 * this.config.zoom);
    this.dirty = true;
  }

  getTransform(): Mat4 {
    if (this.dirty) this.updateMatrices();
    return mat4Clone(this.viewProjMatrix);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    if (this.dirty) this.updateMatrices();
    const invZoom = 1 / this.config.zoom;
    const cos = Math.cos(-this.config.rotation);
    const sin = Math.sin(-this.config.rotation);
    const cx = sx - this.config.width / 2;
    const cy = sy - this.config.height / 2;
    const rx = cx * cos - cy * sin;
    const ry = cx * sin + cy * cos;
    return {
      x: rx * invZoom + this.config.x + this.config.width / (2 * this.config.zoom),
      y: ry * invZoom + this.config.y + this.config.height / (2 * this.config.zoom),
    };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    if (this.dirty) this.updateMatrices();
    const z = this.config.zoom;
    const dx = wx - this.config.x - this.config.width / (2 * z);
    const dy = wy - this.config.y - this.config.height / (2 * z);
    const cos = Math.cos(this.config.rotation);
    const sin = Math.sin(this.config.rotation);
    return {
      x: (dx * cos - dy * sin) * z + this.config.width / 2,
      y: (dx * sin + dy * cos) * z + this.config.height / 2,
    };
  }

  private updateMatrices(): void {
    const c = this.config;
    const halfW = c.width / 2;
    const halfH = c.height / 2;

    mat4Ortho(this.projMatrix, -halfW, halfW, -halfH, halfH, -1, 1);

    const t = mat4Create();
    mat4Translate(t, { x: -c.x - halfW / c.zoom, y: -c.y - halfH / c.zoom });
    const s = mat4Create();
    mat4Scale(s, { x: c.zoom, y: c.zoom });
    const r = mat4Create();
    mat4RotateZ(r, c.rotation);

    let vm = mat4Create();
    mat4Multiply(vm, r, t);
    mat4Multiply(vm, s, vm);

    mat4Multiply(this.viewProjMatrix, this.projMatrix, vm);
    this.dirty = false;
  }
}
