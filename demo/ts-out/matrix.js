export function mat4Create() {
    return new Float64Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);
}
export function mat4Identity(out) {
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
}
export function mat4Multiply(out, a, b) {
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
export function mat4Translate(out, v) {
    const x = v.x, y = v.y, z = v.z !== undefined ? v.z : 0;
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = x; out[13] = y; out[14] = z; out[15] = 1;
    return out;
}
export function mat4Scale(out, v) {
    const x = v.x, y = v.y, z = v.z !== undefined ? v.z : 1;
    out[0] = x; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = y; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = z; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
}
export function mat4RotateZ(out, angle) {
    const s = Math.sin(angle), c = Math.cos(angle);
    out[0] = c; out[1] = s; out[2] = 0; out[3] = 0;
    out[4] = -s; out[5] = c; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
}
export function mat4Ortho(out, left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out[0] = -2 * lr; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = -2 * bt; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = 2 * nf; out[11] = 0;
    out[12] = (left + right) * lr; out[13] = (top + bottom) * bt; out[14] = (far + near) * nf; out[15] = 1;
    return out;
}
export function mat4TransformPoint(m, x, y) {
    const w = m[3] * x + m[7] * y + m[11] * 0 + m[15];
    return {
        x: (m[0] * x + m[4] * y + m[8] * 0 + m[12]) / w,
        y: (m[1] * x + m[5] * y + m[9] * 0 + m[13]) / w,
    };
}
export function mat4Clone(m) {
    const out = new Float64Array(16);
    for (let i = 0; i < 16; i++) out[i] = m[i];
    return out;
}
export class MatrixStack {
    constructor() {
        this.stack = [];
        this.current = mat4Create();
    }
    push() {
        this.stack.push(mat4Clone(this.current));
    }
    pop() {
        if (this.stack.length > 0) {
            this.current = this.stack.pop();
        }
    }
    multiply(m) {
        const result = mat4Create();
        mat4Multiply(result, this.current, m);
        this.current = result;
    }
    translate(x, y) {
        const t = mat4Create();
        mat4Translate(t, { x, y });
        this.multiply(t);
    }
    scale(x, y) {
        const s = mat4Create();
        mat4Scale(s, { x, y });
        this.multiply(s);
    }
    rotate(angle) {
        const r = mat4Create();
        mat4RotateZ(r, angle);
        this.multiply(r);
    }
    transformPoint(x, y) {
        return mat4TransformPoint(this.current, x, y);
    }
    get depth() {
        return this.stack.length;
    }
}
//# sourceMappingURL=matrix.js.map
