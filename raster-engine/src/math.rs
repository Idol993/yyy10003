#[inline(always)]
pub fn clampf(v: f32, lo: f32, hi: f32) -> f32 {
    if v < lo { lo } else if v > hi { hi } else { v }
}

#[inline(always)]
pub fn clampi(v: i32, lo: i32, hi: i32) -> i32 {
    if v < lo { lo } else if v > hi { hi } else { v }
}

#[inline(always)]
pub fn minf(a: f32, b: f32) -> f32 {
    if a < b { a } else { b }
}

#[inline(always)]
pub fn maxf(a: f32, b: f32) -> f32 {
    if a > b { a } else { b }
}

#[inline(always)]
pub fn mini(a: i32, b: i32) -> i32 {
    if a < b { a } else { b }
}

#[inline(always)]
pub fn maxi(a: i32, b: i32) -> i32 {
    if a > b { a } else { b }
}

#[inline(always)]
pub fn floorf(v: f32) -> f32 {
    v.floor()
}

#[inline(always)]
pub fn ceilf(v: f32) -> f32 {
    v.ceil()
}

#[derive(Clone, Copy, Debug)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    #[inline(always)]
    pub fn new(x: f32, y: f32) -> Self {
        Vec2 { x, y }
    }

    #[inline(always)]
    pub fn zero() -> Self {
        Vec2 { x: 0.0, y: 0.0 }
    }

    #[inline(always)]
    pub fn dot(self, other: Vec2) -> f32 {
        self.x * other.x + self.y * other.y
    }

    #[inline(always)]
    pub fn cross(self, other: Vec2) -> f32 {
        self.x * other.y - self.y * other.x
    }

    #[inline(always)]
    pub fn length(self) -> f32 {
        self.dot(self).sqrt()
    }

    #[inline(always)]
    pub fn normalize(self) -> Vec2 {
        let len = self.length();
        if len > 1e-8 {
            Vec2 { x: self.x / len, y: self.y / len }
        } else {
            Vec2::zero()
        }
    }
}

impl std::ops::Sub for Vec2 {
    type Output = Vec2;
    #[inline(always)]
    fn sub(self, rhs: Vec2) -> Vec2 {
        Vec2 { x: self.x - rhs.x, y: self.y - rhs.y }
    }
}

impl std::ops::Add for Vec2 {
    type Output = Vec2;
    #[inline(always)]
    fn add(self, rhs: Vec2) -> Vec2 {
        Vec2 { x: self.x + rhs.x, y: self.y + rhs.y }
    }
}

impl std::ops::Mul<f32> for Vec2 {
    type Output = Vec2;
    #[inline(always)]
    fn mul(self, s: f32) -> Vec2 {
        Vec2 { x: self.x * s, y: self.y * s }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    #[inline(always)]
    pub fn new(x: f32, y: f32, z: f32) -> Self {
        Vec3 { x, y, z }
    }

    #[inline(always)]
    pub fn dot(self, other: Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    #[inline(always)]
    pub fn cross(self, other: Vec3) -> Vec3 {
        Vec3 {
            x: self.y * other.z - self.z * other.y,
            y: self.z * other.x - self.x * other.z,
            z: self.x * other.y - self.y * other.x,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Vec4 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

impl Vec4 {
    #[inline(always)]
    pub fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
        Vec4 { x, y, z, w }
    }

    #[inline(always)]
    pub fn zero() -> Self {
        Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 0.0 }
    }

    #[inline(always)]
    pub fn identity() -> Self {
        Vec4 { x: 0.0, y: 0.0, z: 0.0, w: 1.0 }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Mat4 {
    pub m: [[f32; 4]; 4],
}

impl Mat4 {
    #[inline(always)]
    pub fn identity() -> Self {
        Mat4 {
            m: [
                [1.0, 0.0, 0.0, 0.0],
                [0.0, 1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0, 0.0],
                [0.0, 0.0, 0.0, 1.0],
            ],
        }
    }

    #[inline(always)]
    pub fn ortho(left: f32, right: f32, bottom: f32, top: f32, near: f32, far: f32) -> Self {
        let mut m = Mat4::identity();
        m.m[0][0] = 2.0 / (right - left);
        m.m[1][1] = 2.0 / (top - bottom);
        m.m[2][2] = -2.0 / (far - near);
        m.m[3][0] = -(right + left) / (right - left);
        m.m[3][1] = -(top + bottom) / (top - bottom);
        m.m[3][2] = -(far + near) / (far - near);
        m
    }

    #[inline(always)]
    pub fn translation(tx: f32, ty: f32, tz: f32) -> Self {
        let mut m = Mat4::identity();
        m.m[3][0] = tx;
        m.m[3][1] = ty;
        m.m[3][2] = tz;
        m
    }

    #[inline(always)]
    pub fn scaling(sx: f32, sy: f32, sz: f32) -> Self {
        let mut m = Mat4::identity();
        m.m[0][0] = sx;
        m.m[1][1] = sy;
        m.m[2][2] = sz;
        m
    }

    #[inline(always)]
    pub fn rotation_z(angle: f32) -> Self {
        let c = angle.cos();
        let s = angle.sin();
        let mut m = Mat4::identity();
        m.m[0][0] = c;
        m.m[0][1] = s;
        m.m[1][0] = -s;
        m.m[1][1] = c;
        m
    }

    pub fn mul(&self, other: &Mat4) -> Mat4 {
        let mut result = Mat4::identity();
        for i in 0..4 {
            for j in 0..4 {
                result.m[i][j] = 0.0;
                for k in 0..4 {
                    result.m[i][j] += self.m[i][k] * other.m[k][j];
                }
            }
        }
        result
    }

    pub fn transform_vec4(&self, v: &Vec4) -> Vec4 {
        Vec4::new(
            self.m[0][0] * v.x + self.m[0][1] * v.y + self.m[0][2] * v.z + self.m[0][3] * v.w,
            self.m[1][0] * v.x + self.m[1][1] * v.y + self.m[1][2] * v.z + self.m[1][3] * v.w,
            self.m[2][0] * v.x + self.m[2][1] * v.y + self.m[2][2] * v.z + self.m[2][3] * v.w,
            self.m[3][0] * v.x + self.m[3][1] * v.y + self.m[3][2] * v.z + self.m[3][3] * v.w,
        )
    }

    #[inline(always)]
    pub fn transform_point(&self, x: f32, y: f32) -> (f32, f32) {
        let tx = self.m[0][0] * x + self.m[0][1] * y + self.m[0][3];
        let ty = self.m[1][0] * x + self.m[1][1] * y + self.m[1][3];
        (tx, ty)
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Color {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}

impl Color {
    #[inline(always)]
    pub fn new(r: f32, g: f32, b: f32, a: f32) -> Self {
        Color {
            r: clampf(r, 0.0, 1.0),
            g: clampf(g, 0.0, 1.0),
            b: clampf(b, 0.0, 1.0),
            a: clampf(a, 0.0, 1.0),
        }
    }

    #[inline(always)]
    pub fn white() -> Self {
        Color { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
    }

    #[inline(always)]
    pub fn black() -> Self {
        Color { r: 0.0, g: 0.0, b: 0.0, a: 1.0 }
    }

    #[inline(always)]
    pub fn transparent() -> Self {
        Color { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }
    }

    #[inline(always)]
    pub fn to_rgba8(&self) -> [u8; 4] {
        [
            (self.r * 255.0 + 0.5) as u8,
            (self.g * 255.0 + 0.5) as u8,
            (self.b * 255.0 + 0.5) as u8,
            (self.a * 255.0 + 0.5) as u8,
        ]
    }

    #[inline(always)]
    pub fn from_rgba8(r: u8, g: u8, b: u8, a: u8) -> Self {
        Color {
            r: r as f32 / 255.0,
            g: g as f32 / 255.0,
            b: b as f32 / 255.0,
            a: a as f32 / 255.0,
        }
    }
}
