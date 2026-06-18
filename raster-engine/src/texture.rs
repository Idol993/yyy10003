use crate::math::Color;

pub struct Texture {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

impl Texture {
    pub fn new(width: u32, height: u32, data: Vec<u8>) -> Self {
        Texture { width, height, data }
    }

    #[inline(always)]
    fn texel(&self, x: i32, y: i32) -> Color {
        let tx = x.rem_euclid(self.width as i32);
        let ty = y.rem_euclid(self.height as i32);
        let idx = (ty as usize * self.width as usize + tx as usize) * 4;
        if idx + 3 >= self.data.len() {
            return Color::transparent();
        }
        Color::from_rgba8(
            self.data[idx],
            self.data[idx + 1],
            self.data[idx + 2],
            self.data[idx + 3],
        )
    }

    #[inline(always)]
    pub fn sample_nearest(&self, u: f32, v: f32) -> Color {
        let px = (u * self.width as f32) as i32;
        let py = (v * self.height as f32) as i32;
        self.texel(px, py)
    }

    #[inline(always)]
    pub fn sample_linear(&self, u: f32, v: f32) -> Color {
        let fx = u * self.width as f32 - 0.5;
        let fy = v * self.height as f32 - 0.5;
        let x0 = fx.floor() as i32;
        let y0 = fy.floor() as i32;
        let dx = fx - x0 as f32;
        let dy = fy - y0 as f32;

        let c00 = self.texel(x0, y0);
        let c10 = self.texel(x0 + 1, y0);
        let c01 = self.texel(x0, y0 + 1);
        let c11 = self.texel(x0 + 1, y0 + 1);

        let r = c00.r * (1.0 - dx) * (1.0 - dy) + c10.r * dx * (1.0 - dy)
              + c01.r * (1.0 - dx) * dy + c11.r * dx * dy;
        let g = c00.g * (1.0 - dx) * (1.0 - dy) + c10.g * dx * (1.0 - dy)
              + c01.g * (1.0 - dx) * dy + c11.g * dx * dy;
        let b = c00.b * (1.0 - dx) * (1.0 - dy) + c10.b * dx * (1.0 - dy)
              + c01.b * (1.0 - dx) * dy + c11.b * dx * dy;
        let a = c00.a * (1.0 - dx) * (1.0 - dy) + c10.a * dx * (1.0 - dy)
              + c01.a * (1.0 - dx) * dy + c11.a * dx * dy;

        Color { r, g, b, a }
    }
}
