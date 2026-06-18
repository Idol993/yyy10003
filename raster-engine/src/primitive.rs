use crate::math::Color;
use crate::buffer::Framebuffer;
use crate::raster::rasterize_polygon_msaa;

pub fn draw_rect_filled(
    fb: &mut Framebuffer,
    x: f32, y: f32, w: f32, h: f32,
    color: Color,
    blend_mode: u32,
) {
    let x0 = x.floor() as i32;
    let y0 = y.floor() as i32;
    let x1 = (x + w).ceil() as i32;
    let y1 = (y + h).ceil() as i32;

    for py in y0..y1 {
        for px in x0..x1 {
            fb.blend_pixel(px, py, color, blend_mode);
        }
    }
}

pub fn draw_rect_stroked(
    fb: &mut Framebuffer,
    x: f32, y: f32, w: f32, h: f32,
    color: Color,
    line_width: f32,
    blend_mode: u32,
) {
    let hw = line_width * 0.5;
    draw_rect_filled(fb, x - hw, y - hw, w + line_width, line_width, color, blend_mode);
    draw_rect_filled(fb, x - hw, y + h - hw, w + line_width, line_width, color, blend_mode);
    draw_rect_filled(fb, x - hw, y, line_width, h, color, blend_mode);
    draw_rect_filled(fb, x + w - hw, y, line_width, h, color, blend_mode);
}

pub fn draw_circle_filled(
    fb: &mut Framebuffer,
    cx: f32, cy: f32, radius: f32,
    color: Color,
    msaa: bool,
    blend_mode: u32,
) {
    let r2 = radius * radius;
    let x0 = (cx - radius).floor() as i32;
    let y0 = (cy - radius).floor() as i32;
    let x1 = (cx + radius).ceil() as i32;
    let y1 = (cy + radius).ceil() as i32;

    if msaa {
        const MSAA_OFFSETS: [(f32, f32); 4] = [
            (0.125, 0.625),
            (0.375, 0.125),
            (0.625, 0.875),
            (0.875, 0.375),
        ];

        for py in y0..y1 {
            for px in x0..x1 {
                let mut coverage = 0u32;
                for &(ox, oy) in &MSAA_OFFSETS {
                    let sx = px as f32 + ox - cx;
                    let sy = py as f32 + oy - cy;
                    if sx * sx + sy * sy <= r2 {
                        coverage += 1;
                    }
                }
                if coverage > 0 {
                    let alpha = color.a * (coverage as f32 / 4.0);
                    let pc = Color { r: color.r, g: color.g, b: color.b, a: alpha };
                    fb.blend_pixel(px, py, pc, blend_mode);
                }
            }
        }
    } else {
        for py in y0..y1 {
            for px in x0..x1 {
                let dx = px as f32 + 0.5 - cx;
                let dy = py as f32 + 0.5 - cy;
                if dx * dx + dy * dy <= r2 {
                    fb.blend_pixel(px, py, color, blend_mode);
                }
            }
        }
    }
}

pub fn draw_circle_stroked(
    fb: &mut Framebuffer,
    cx: f32, cy: f32, radius: f32,
    color: Color,
    line_width: f32,
    msaa: bool,
    blend_mode: u32,
) {
    let outer_r2 = (radius + line_width * 0.5) * (radius + line_width * 0.5);
    let inner_r2 = (radius - line_width * 0.5).max(0.0);
    let inner_r2 = inner_r2 * inner_r2;

    let x0 = (cx - radius - line_width).floor() as i32;
    let y0 = (cy - radius - line_width).floor() as i32;
    let x1 = (cx + radius + line_width).ceil() as i32;
    let y1 = (cy + radius + line_width).ceil() as i32;

    for py in y0..y1 {
        for px in x0..x1 {
            let dx = px as f32 + 0.5 - cx;
            let dy = py as f32 + 0.5 - cy;
            let d2 = dx * dx + dy * dy;
            if d2 <= outer_r2 && d2 >= inner_r2 {
                fb.blend_pixel(px, py, color, blend_mode);
            }
        }
    }
}

pub fn draw_line(
    fb: &mut Framebuffer,
    x0: f32, y0: f32, x1: f32, y1: f32,
    color: Color,
    line_width: f32,
    blend_mode: u32,
) {
    let dx = x1 - x0;
    let dy = y1 - y0;
    let len = (dx * dx + dy * dy).sqrt();
    if len < 1e-6 { return; }

    let nx = -dy / len * line_width * 0.5;
    let ny = dx / len * line_width * 0.5;

    let points = [
        (x0 + nx, y0 + ny),
        (x1 + nx, y1 + ny),
        (x1 - nx, y1 - ny),
        (x0 - nx, y0 - ny),
    ];

    rasterize_polygon_msaa(fb, &points, color, blend_mode);
}

pub fn draw_quad_bezier(
    fb: &mut Framebuffer,
    x0: f32, y0: f32,
    x1: f32, y1: f32,
    x2: f32, y2: f32,
    color: Color,
    line_width: f32,
    steps: u32,
    blend_mode: u32,
) {
    let steps = if steps == 0 { 16 } else { steps };
    let mut prev_x = x0;
    let mut prev_y = y0;

    for i in 1..=steps {
        let t = i as f32 / steps as f32;
        let mt = 1.0 - t;
        let cx = mt * mt * x0 + 2.0 * mt * t * x1 + t * t * x2;
        let cy = mt * mt * y0 + 2.0 * mt * t * y1 + t * t * y2;
        draw_line(fb, prev_x, prev_y, cx, cy, color, line_width, blend_mode);
        prev_x = cx;
        prev_y = cy;
    }
}

pub fn draw_cubic_bezier(
    fb: &mut Framebuffer,
    x0: f32, y0: f32,
    x1: f32, y1: f32,
    x2: f32, y2: f32,
    x3: f32, y3: f32,
    color: Color,
    line_width: f32,
    steps: u32,
    blend_mode: u32,
) {
    let steps = if steps == 0 { 20 } else { steps };
    let mut prev_x = x0;
    let mut prev_y = y0;

    for i in 1..=steps {
        let t = i as f32 / steps as f32;
        let mt = 1.0 - t;
        let cx = mt * mt * mt * x0 + 3.0 * mt * mt * t * x1 + 3.0 * mt * t * t * x2 + t * t * t * x3;
        let cy = mt * mt * mt * y0 + 3.0 * mt * mt * t * y1 + 3.0 * mt * t * t * y2 + t * t * t * y3;
        draw_line(fb, prev_x, prev_y, cx, cy, color, line_width, blend_mode);
        prev_x = cx;
        prev_y = cy;
    }
}
