mod math;
mod buffer;
mod blend;
mod texture;
mod raster;
mod layer;
mod font;
mod primitive;

use std::collections::BTreeMap;
use wasm_bindgen::prelude::*;
use math::Color;
use buffer::Framebuffer;
use texture::Texture;
use layer::{Layer, composite_layer};
use font::Font;
use raster::{TriangleVertex, rasterize_triangle, rasterize_polygon_scanline, rasterize_polygon_msaa};
use primitive::*;

#[wasm_bindgen]
pub struct RasterEngine {
    main_fb: Framebuffer,
    layers: BTreeMap<u32, Layer>,
    next_layer_id: u32,
    textures: BTreeMap<u32, Texture>,
    next_texture_id: u32,
    fonts: BTreeMap<u32, Font>,
    next_font_id: u32,
    active_layer: u32,
    blend_mode: u32,
}

#[wasm_bindgen]
impl RasterEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> RasterEngine {
        RasterEngine {
            main_fb: Framebuffer::new(width, height),
            layers: BTreeMap::new(),
            next_layer_id: 1,
            textures: BTreeMap::new(),
            next_texture_id: 1,
            fonts: BTreeMap::new(),
            next_font_id: 1,
            active_layer: 0,
            blend_mode: 0,
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        self.main_fb.resize(width, height);
        for (_, layer) in self.layers.iter_mut() {
            layer.resize(width, height);
        }
    }

    pub fn get_buffer_ptr(&self) -> *const u8 {
        self.main_fb.ptr()
    }

    pub fn get_buffer_len(&self) -> usize {
        self.main_fb.len()
    }

    pub fn get_width(&self) -> u32 {
        self.main_fb.width
    }

    pub fn get_height(&self) -> u32 {
        self.main_fb.height
    }

    pub fn clear(&mut self, r: f32, g: f32, b: f32, a: f32) {
        let fb = self.active_fb();
        fb.clear(Color::new(r, g, b, a));
    }

    pub fn set_blend_mode(&mut self, mode: u32) {
        self.blend_mode = mode;
    }

    pub fn get_blend_mode(&self) -> u32 {
        self.blend_mode
    }

    pub fn draw_triangle_filled(
        &mut self,
        x0: f32, y0: f32, u0: f32, v0: f32, w0: f32,
        x1: f32, y1: f32, u1: f32, v1: f32, w1: f32,
        x2: f32, y2: f32, u2: f32, v2: f32, w2: f32,
        r: f32, g: f32, b: f32, a: f32,
        use_texture: bool, texture_id: u32,
        use_perspective: bool, msaa: bool,
    ) {
        let color = Color::new(r, g, b, a);
        let tex = if use_texture {
            self.textures.get(&texture_id)
        } else {
            None
        };

        let v0 = TriangleVertex { x: x0, y: y0, u: u0, v: v0, w: w0 };
        let v1 = TriangleVertex { x: x1, y: y1, u: u1, v: v1, w: w1 };
        let v2 = TriangleVertex { x: x2, y: y2, u: u2, v: v2, w: w2 };

        let blend_mode = self.blend_mode;

        if self.active_layer == 0 {
            rasterize_triangle(&mut self.main_fb, &v0, &v1, &v2, color, tex, use_perspective, msaa, blend_mode);
        } else if let Some(layer) = self.layers.get_mut(&self.active_layer) {
            rasterize_triangle(&mut layer.framebuffer, &v0, &v1, &v2, color, tex, use_perspective, msaa, blend_mode);
        }
    }

    pub fn draw_rect(&mut self, x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        draw_rect_filled(fb, x, y, w, h, color, self.blend_mode);
    }

    pub fn draw_rect_stroke(&mut self, x: f32, y: f32, w: f32, h: f32, r: f32, g: f32, b: f32, a: f32, line_width: f32) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        draw_rect_stroked(fb, x, y, w, h, color, line_width, self.blend_mode);
    }

    pub fn draw_circle(&mut self, cx: f32, cy: f32, radius: f32, r: f32, g: f32, b: f32, a: f32, msaa: bool) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        draw_circle_filled(fb, cx, cy, radius, color, msaa, self.blend_mode);
    }

    pub fn draw_circle_stroke(&mut self, cx: f32, cy: f32, radius: f32, r: f32, g: f32, b: f32, a: f32, line_width: f32, msaa: bool) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        draw_circle_stroked(fb, cx, cy, radius, color, line_width, msaa, self.blend_mode);
    }

    pub fn draw_line(&mut self, x0: f32, y0: f32, x1: f32, y1: f32, r: f32, g: f32, b: f32, a: f32, line_width: f32) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        primitive::draw_line(fb, x0, y0, x1, y1, color, line_width, self.blend_mode);
    }

    pub fn draw_quad_bezier(&mut self, x0: f32, y0: f32, x1: f32, y1: f32, x2: f32, y2: f32, r: f32, g: f32, b: f32, a: f32, line_width: f32, steps: u32) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        draw_quad_bezier(fb, x0, y0, x1, y1, x2, y2, color, line_width, steps, self.blend_mode);
    }

    pub fn draw_cubic_bezier(&mut self, x0: f32, y0: f32, x1: f32, y1: f32, x2: f32, y2: f32, x3: f32, y3: f32, r: f32, g: f32, b: f32, a: f32, line_width: f32, steps: u32) {
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        draw_cubic_bezier(fb, x0, y0, x1, y1, x2, y2, x3, y3, color, line_width, steps, self.blend_mode);
    }

    pub fn draw_polygon(&mut self, points_ptr: *const f32, points_len: usize, r: f32, g: f32, b: f32, a: f32, msaa: bool) {
        if points_len < 6 || points_len % 2 != 0 { return; }
        let points_slice = unsafe { core::slice::from_raw_parts(points_ptr, points_len) };
        let mut points: Vec<(f32, f32)> = Vec::with_capacity(points_len / 2);
        let mut i = 0;
        while i + 1 < points_len {
            points.push((points_slice[i], points_slice[i + 1]));
            i += 2;
        }
        let color = Color::new(r, g, b, a);
        let fb = self.active_fb();
        if msaa {
            rasterize_polygon_msaa(fb, &points, color, self.blend_mode);
        } else {
            rasterize_polygon_scanline(fb, &points, color, self.blend_mode);
        }
    }

    pub fn create_texture(&mut self, width: u32, height: u32, data_ptr: *const u8, data_len: usize) -> u32 {
        let data_slice = unsafe { core::slice::from_raw_parts(data_ptr, data_len) };
        let mut data = Vec::with_capacity(data_len);
        data.extend_from_slice(data_slice);
        let id = self.next_texture_id;
        self.next_texture_id += 1;
        self.textures.insert(id, Texture::new(width, height, data));
        id
    }

    pub fn free_texture(&mut self, id: u32) {
        self.textures.remove(&id);
    }

    pub fn create_layer(&mut self) -> u32 {
        let id = self.next_layer_id;
        self.next_layer_id += 1;
        let w = self.main_fb.width;
        let h = self.main_fb.height;
        self.layers.insert(id, Layer::new(id, w, h));
        id
    }

    pub fn set_active_layer(&mut self, id: u32) {
        self.active_layer = id;
    }

    pub fn get_active_layer(&self) -> u32 {
        self.active_layer
    }

    pub fn set_layer_blend_mode(&mut self, id: u32, mode: u32) {
        if let Some(layer) = self.layers.get_mut(&id) {
            layer.blend_mode = mode;
        }
    }

    pub fn set_layer_opacity(&mut self, id: u32, opacity: f32) {
        if let Some(layer) = self.layers.get_mut(&id) {
            layer.opacity = opacity;
        }
    }

    pub fn set_layer_visible(&mut self, id: u32, visible: bool) {
        if let Some(layer) = self.layers.get_mut(&id) {
            layer.visible = visible;
        }
    }

    pub fn set_layer_clip(&mut self, id: u32, x: i32, y: i32, w: i32, h: i32) {
        if let Some(layer) = self.layers.get_mut(&id) {
            layer.set_clip(x, y, w, h);
        }
    }

    pub fn clear_layer_clip(&mut self, id: u32) {
        if let Some(layer) = self.layers.get_mut(&id) {
            layer.clear_clip();
        }
    }

    pub fn clear_layer(&mut self, id: u32, r: f32, g: f32, b: f32, a: f32) {
        if let Some(layer) = self.layers.get_mut(&id) {
            layer.framebuffer.clear(Color::new(r, g, b, a));
        }
    }

    pub fn composite_layer_to_main(&mut self, id: u32) {
        if let Some(layer) = self.layers.get(&id) {
            composite_layer(&mut self.main_fb, layer);
        }
    }

    pub fn composite_all_layers(&mut self) {
        let mut layer_ids: Vec<u32> = self.layers.keys().copied().collect();
        layer_ids.sort();
        for id in layer_ids {
            if let Some(layer) = self.layers.get(&id) {
                composite_layer(&mut self.main_fb, layer);
            }
        }
    }

    pub fn free_layer(&mut self, id: u32) {
        self.layers.remove(&id);
        if self.active_layer == id {
            self.active_layer = 0;
        }
    }

    pub fn load_font(&mut self, data_ptr: *const u8, data_len: usize) -> u32 {
        let data_slice = unsafe { core::slice::from_raw_parts(data_ptr, data_len) };
        match Font::parse(data_slice) {
            Ok(font) => {
                let id = self.next_font_id;
                self.next_font_id += 1;
                self.fonts.insert(id, font);
                id
            }
            Err(_) => 0,
        }
    }

    pub fn set_font_size(&mut self, font_id: u32, size_px: f32) {
        if let Some(font) = self.fonts.get_mut(&font_id) {
            font.set_size(size_px);
        }
    }

    pub fn draw_text(&mut self, font_id: u32, text: &str, x: f32, y: f32, r: f32, g: f32, b: f32, a: f32) -> f32 {
        let color = Color::new(r, g, b, a);
        let blend_mode = self.blend_mode;

        if self.active_layer == 0 {
            if let Some(font) = self.fonts.get(&font_id) {
                return font.draw_text(&mut self.main_fb, text, x, y, color, blend_mode);
            }
        } else if let Some(layer) = self.layers.get_mut(&self.active_layer) {
            if let Some(font) = self.fonts.get(&font_id) {
                return font.draw_text(&mut layer.framebuffer, text, x, y, color, blend_mode);
            }
        }
        x
    }

    pub fn measure_text(&self, font_id: u32, text: &str) -> f32 {
        if let Some(font) = self.fonts.get(&font_id) {
            font.measure_text(text)
        } else {
            0.0
        }
    }

    pub fn get_font_line_height(&self, font_id: u32) -> f32 {
        if let Some(font) = self.fonts.get(&font_id) {
            font.line_height()
        } else {
            0.0
        }
    }

    pub fn get_layer_ptr(&self, id: u32) -> *const u8 {
        if let Some(layer) = self.layers.get(&id) {
            layer.framebuffer.ptr()
        } else {
            core::ptr::null()
        }
    }

    pub fn get_layer_len(&self, id: u32) -> usize {
        if let Some(layer) = self.layers.get(&id) {
            layer.framebuffer.len()
        } else {
            0
        }
    }

    pub fn benchmark_triangles(&mut self, count: u32, size: f32) -> f64 {
        let w = self.main_fb.width as f32;
        let h = self.main_fb.height as f32;
        let color = Color::new(1.0, 0.0, 0.0, 0.5);

        let start = js_sys::Date::now();
        for _ in 0..count {
            let x0 = w * 0.5;
            let y0 = h * 0.5 - size;
            let x1 = w * 0.5 - size * 0.866;
            let y1 = h * 0.5 + size * 0.5;
            let x2 = w * 0.5 + size * 0.866;
            let y2 = h * 0.5 + size * 0.5;

            let v0 = TriangleVertex { x: x0, y: y0, u: 0.5, v: 0.0, w: 1.0 };
            let v1 = TriangleVertex { x: x1, y: y1, u: 0.0, v: 1.0, w: 1.0 };
            let v2 = TriangleVertex { x: x2, y: y2, u: 1.0, v: 1.0, w: 1.0 };

            rasterize_triangle(&mut self.main_fb, &v0, &v1, &v2, color, None, false, false, self.blend_mode);
        }
        let end = js_sys::Date::now();
        end - start
    }

    pub fn benchmark_circles(&mut self, count: u32, radius: f32) -> f64 {
        let w = self.main_fb.width as f32;
        let h = self.main_fb.height as f32;
        let color = Color::new(0.0, 1.0, 0.0, 0.5);

        let start = js_sys::Date::now();
        for i in 0..count {
            let cx = (i as f32 * 37.0) % w;
            let cy = (i as f32 * 53.0) % h;
            draw_circle_filled(&mut self.main_fb, cx, cy, radius, color, false, self.blend_mode);
        }
        let end = js_sys::Date::now();
        end - start
    }

    pub fn benchmark_polygons(&mut self, count: u32, sides: u32, radius: f32) -> f64 {
        let w = self.main_fb.width as f32;
        let h = self.main_fb.height as f32;
        let color = Color::new(0.0, 0.5, 1.0, 0.7);

        let start = js_sys::Date::now();
        for i in 0..count {
            let cx = (i as f32 * 73.0) % w;
            let cy = (i as f32 * 47.0) % h;
            let mut points: Vec<(f32, f32)> = Vec::with_capacity(sides as usize);
            for s in 0..sides {
                let angle = (s as f32 / sides as f32) * std::f32::consts::TAU + (i as f32 * 0.013);
                let px = cx + angle.cos() * radius;
                let py = cy + angle.sin() * radius;
                points.push((px, py));
            }
            rasterize_polygon_scanline(&mut self.main_fb, &points, color, self.blend_mode);
        }
        let end = js_sys::Date::now();
        end - start
    }

    pub fn malloc(&self, size: usize) -> *mut u8 {
        let mut vec: Vec<u8> = Vec::with_capacity(size);
        let ptr = vec.as_mut_ptr();
        std::mem::forget(vec);
        ptr
    }

    pub fn free(&self, ptr: *mut u8, size: usize) {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, size, size);
        }
    }
}

impl RasterEngine {
    fn active_fb(&mut self) -> &mut Framebuffer {
        if self.active_layer == 0 {
            &mut self.main_fb
        } else if let Some(layer) = self.layers.get_mut(&self.active_layer) {
            &mut layer.framebuffer
        } else {
            &mut self.main_fb
        }
    }
}
