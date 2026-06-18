use crate::math::{clampi, Color};
use crate::blend;

pub struct Framebuffer {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

impl Framebuffer {
    pub fn new(width: u32, height: u32) -> Self {
        let len = (width as usize) * (height as usize) * 4;
        Framebuffer {
            width,
            height,
            data: vec![0u8; len],
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
        let len = (width as usize) * (height as usize) * 4;
        self.data.resize(len, 0);
    }

    #[inline(always)]
    pub fn ptr(&self) -> *const u8 {
        self.data.as_ptr()
    }

    #[inline(always)]
    pub fn len(&self) -> usize {
        self.data.len()
    }

    #[inline(always)]
    pub fn ptr_mut(&mut self) -> *mut u8 {
        self.data.as_mut_ptr()
    }

    #[inline(always)]
    fn index(&self, x: i32, y: i32) -> usize {
        ((y as usize) * (self.width as usize) + (x as usize)) * 4
    }

    #[inline(always)]
    pub fn is_in_bounds(&self, x: i32, y: i32) -> bool {
        x >= 0 && x < self.width as i32 && y >= 0 && y < self.height as i32
    }

    pub fn clear(&mut self, color: Color) {
        let rgba = color.to_rgba8();
        let len = self.data.len();
        let mut i = 0;
        while i + 4 <= len {
            self.data[i] = rgba[0];
            self.data[i + 1] = rgba[1];
            self.data[i + 2] = rgba[2];
            self.data[i + 3] = rgba[3];
            i += 4;
        }
    }

    #[inline(always)]
    pub fn set_pixel(&mut self, x: i32, y: i32, color: Color) {
        if !self.is_in_bounds(x, y) { return; }
        let idx = self.index(x, y);
        let rgba = color.to_rgba8();
        self.data[idx] = rgba[0];
        self.data[idx + 1] = rgba[1];
        self.data[idx + 2] = rgba[2];
        self.data[idx + 3] = rgba[3];
    }

    #[inline(always)]
    pub fn get_pixel(&self, x: i32, y: i32) -> Color {
        if !self.is_in_bounds(x, y) { return Color::transparent(); }
        let idx = self.index(x, y);
        Color::from_rgba8(
            self.data[idx],
            self.data[idx + 1],
            self.data[idx + 2],
            self.data[idx + 3],
        )
    }

    #[inline(always)]
    pub fn blend_pixel(&mut self, x: i32, y: i32, src: Color, blend_mode: u32) {
        if !self.is_in_bounds(x, y) { return; }
        if src.a < 1.0 / 255.0 { return; }
        let idx = self.index(x, y);
        let dst = Color::from_rgba8(
            self.data[idx],
            self.data[idx + 1],
            self.data[idx + 2],
            self.data[idx + 3],
        );
        let result = blend::blend_color(src, dst, blend_mode);
        let rgba = result.to_rgba8();
        self.data[idx] = rgba[0];
        self.data[idx + 1] = rgba[1];
        self.data[idx + 2] = rgba[2];
        self.data[idx + 3] = rgba[3];
    }

    pub fn copy_from(&mut self, src: &Framebuffer, src_x: i32, src_y: i32, dst_x: i32, dst_y: i32, w: i32, h: i32) {
        for dy in 0..h {
            for dx in 0..w {
                let sx = src_x + dx;
                let sy = src_y + dy;
                let ddx = dst_x + dx;
                let ddy = dst_y + dy;
                if src.is_in_bounds(sx, sy) && self.is_in_bounds(ddx, ddy) {
                    let c = src.get_pixel(sx, sy);
                    self.set_pixel(ddx, ddy, c);
                }
            }
        }
    }

    pub fn composite_from(&mut self, src: &Framebuffer, blend_mode: u32, clip_x: i32, clip_y: i32, clip_w: i32, clip_h: i32) {
        let x0 = clampi(clip_x, 0, self.width as i32 - 1);
        let y0 = clampi(clip_y, 0, self.height as i32 - 1);
        let x1 = clampi(clip_x + clip_w, 0, self.width as i32);
        let y1 = clampi(clip_y + clip_h, 0, self.height as i32);

        for y in y0..y1 {
            for x in x0..x1 {
                if src.is_in_bounds(x, y) {
                    let src_color = src.get_pixel(x, y);
                    if src_color.a < 1.0 / 255.0 { continue; }
                    self.blend_pixel(x, y, src_color, blend_mode);
                }
            }
        }
    }
}
