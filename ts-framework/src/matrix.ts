import { Mat4 } from './types';

const IDENTITY = new Float64Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

export function mat4Create(): Mat4 {
  return new Float64Array(IDENTITY);
}

export function mat4Identity(out: Mat4): Mat4 {
  out.set(IDENTITY);
  return out;
}

export function mat4Copy(out: Mat4, a: Mat4): Mat4 {
  out.set(a);
  return out;
}

export function mat4Clone(a: Mat4): Mat4 {
  return new Float64Array(a);
}

export function mat4Multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  return out;
}

export function mat4Translate(out: Mat4, v: { x: number; y: number; z?: number }): Mat4 {
  const x = v.x, y = v.y, z = v.z ?? 0;
  out[12] += out[0] * x + out[4] * y + out[8] * z;
  out[13] += out[1] * x + out[5] * y + out[9] * z;
  out[14] += out[2] * x + out[6] * y + out[10] * z;
  out[15] += out[3] * x + out[7] * y + out[11] * z;
  return out;
}

export function mat4Scale(out: Mat4, v: { x: number; y: number; z?: number }): Mat4 {
  const x = v.x, y = v.y, z = v.z ?? 1;
  out[0] *= x; out[1] *= x; out[2] *= x; out[3] *= x;
  out[4] *= y; out[5] *= y; out[6] *= y; out[7] *= y;
  out[8] *= z; out[9] *= z; out[10] *= z; out[11] *= z;
  return out;
}

export function mat4RotateZ(out: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const a00 = out[0], a01 = out[1], a02 = out[2], a03 = out[3];
  const a10 = out[4], a11 = out[5], a12 = out[6], a13 = out[7];

  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}

export function mat4Ortho(
  out: Mat4,
  left: number, right: number,
  bottom: number, top: number,
  near: number, far: number
): Mat4 {
  const lr = 1 / (left - right);
  const bt = 1 / (bottom - top);
  const nf = 1 / (near - far);
  out[0] = -2 * lr;  out[1] = 0;       out[2] = 0;        out[3] = 0;
  out[4] = 0;        out[5] = -2 * bt;  out[6] = 0;        out[7] = 0;
  out[8] = 0;        out[9] = 0;        out[10] = 2 * nf;  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}

export function mat4TransformPoint(m: Mat4, x: number, y: number): { x: number; y: number } {
  return {
    x: m[0] * x + m[4] * y + m[12],
    y: m[1] * x + m[5] * y + m[13],
  };
}

export class MatrixStack {
  private stack: Mat4[] = [];
  private current: Mat4;

  constructor() {
    this.current = mat4Create();
  }

  get matrix(): Mat4 {
    return this.current;
  }

  push(): void {
    this.stack.push(mat4Clone(this.current));
  }

  pop(): Mat4 | null {
    if (this.stack.length === 0) return null;
    this.current = this.stack.pop()!;
    return this.current;
  }

  translate(x: number, y: number, z: number = 0): void {
    const t = mat4Create();
    mat4Translate(t, { x, y, z });
    const result = mat4Create();
    mat4Multiply(result, this.current, t);
    this.current = result;
  }

  scale(x: number, y: number, z: number = 1): void {
    const s = mat4Create();
    mat4Scale(s, { x, y, z });
    const result = mat4Create();
    mat4Multiply(result, this.current, s);
    this.current = result;
  }

  rotate(angle: number): void {
    const r = mat4Create();
    mat4RotateZ(r, angle);
    const result = mat4Create();
    mat4Multiply(result, this.current, r);
    this.current = result;
  }

  loadIdentity(): void {
    mat4Identity(this.current);
  }

  loadMatrix(m: Mat4): void {
    this.current = mat4Clone(m);
  }

  multiply(m: Mat4): void {
    const result = mat4Create();
    mat4Multiply(result, this.current, m);
    this.current = result;
  }

  transformPoint(x: number, y: number): { x: number; y: number } {
    return mat4TransformPoint(this.current, x, y);
  }

  get depth(): number {
    return this.stack.length;
  }
}
