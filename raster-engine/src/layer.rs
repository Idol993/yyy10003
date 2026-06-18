use crate::buffer::Framebuffer;
use crate::math::{clampf, clampi, Color};

pub struct Layer {
    pub id: u32,
    pub framebuffer: Framebuffer,
    pub visible: bool,
    pub opacity: f32,
    pub blend_mode: u32,
    pub clip_x: i32,
    pub clip_y: i32,
    pub clip_w: i32,
    pub clip_h: i32,
    pub has_clip: bool,
}

impl Layer {
    pub fn new(id: u32, width: u32, height: u32) -> Self {
        Layer {
            id,
            framebuffer: Framebuffer::new(width, height),
            visible: true,
            opacity: 1.0,
            blend_mode: 0,
            clip_x: 0,
            clip_y: 0,
            clip_w: width as i32,
            clip_h: height as i32,
            has_clip: false,
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.framebuffer.resize(width, height);
        if !self.has_clip {
            self.clip_w = width as i32;
            self.clip_h = height as i32;
        }
    }

    pub fn set_clip(&mut self, x: i32, y: i32, w: i32, h: i32) {
        self.clip_x = x;
        self.clip_y = y;
        self.clip_w = w;
        self.clip_h = h;
        self.has_clip = true;
    }

    pub fn clear_clip(&mut self) {
        self.clip_x = 0;
        self.clip_y = 0;
        self.clip_w = self.framebuffer.width as i32;
        self.clip_h = self.framebuffer.height as i32;
        self.has_clip = false;
    }
}

pub fn composite_layer(dst: &mut Framebuffer, src: &Layer) {
    if !src.visible { return; }

    let clip_x = src.clip_x;
    let clip_y = src.clip_y;
    let clip_w = src.clip_w;
    let clip_h = src.clip_h;
    let blend_mode = src.blend_mode;
    let opacity = src.opacity;

    if opacity < 1.0 / 255.0 { return; }

    let x0 = clampi(clip_x, 0, dst.width as i32 - 1);
    let y0 = clampi(clip_y, 0, dst.height as i32 - 1);
    let x1 = clampi(clip_x + clip_w, 0, dst.width as i32);
    let y1 = clampi(clip_y + clip_h, 0, dst.height as i32);

    for y in y0..y1 {
        for x in x0..x1 {
            if !src.framebuffer.is_in_bounds(x, y) { continue; }
            let mut src_color = src.framebuffer.get_pixel(x, y);
            if src_color.a < 1.0 / 255.0 { continue; }

            src_color.a *= opacity;
            dst.blend_pixel(x, y, src_color, blend_mode);
        }
    }
}
