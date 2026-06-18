use crate::math::{clampf, clampi, maxf, minf, Color};
use crate::buffer::Framebuffer;
use crate::texture::Texture;

const MSAA_OFFSETS: [(f32, f32); 4] = [
    (0.125, 0.625),
    (0.375, 0.125),
    (0.625, 0.875),
    (0.875, 0.375),
];

#[inline(always)]
fn edge_function(ax: f32, ay: f32, bx: f32, by: f32, px: f32, py: f32) -> f32 {
    (bx - ax) * (py - ay) - (by - ay) * (px - ax)
}

pub struct TriangleVertex {
    pub x: f32,
    pub y: f32,
    pub u: f32,
    pub v: f32,
    pub w: f32,
}

pub fn rasterize_triangle(
    fb: &mut Framebuffer,
    v0: &TriangleVertex,
    v1: &TriangleVertex,
    v2: &TriangleVertex,
    color: Color,
    texture: Option<&Texture>,
    use_perspective: bool,
    msaa: bool,
    blend_mode: u32,
) {
    let min_x = maxf(maxf(minf(v0.x, v1.x), minf(v1.x, v2.x)), minf(v0.x, v2.x));
    let min_y = maxf(maxf(minf(v0.y, v1.y), minf(v1.y, v2.y)), minf(v0.y, v2.y));
    let max_x = minf(minf(maxf(v0.x, v1.x), maxf(v1.x, v2.x)), maxf(v0.x, v2.x));
    let max_y = minf(minf(maxf(v0.y, v1.y), maxf(v1.y, v2.y)), maxf(v0.y, v2.y));

    let ix0 = clampi(min_x.floor() as i32, 0, fb.width as i32 - 1);
    let iy0 = clampi(min_y.floor() as i32, 0, fb.height as i32 - 1);
    let ix1 = clampi(max_x.ceil() as i32, 0, fb.width as i32);
    let iy1 = clampi(max_y.ceil() as i32, 0, fb.height as i32);

    let area = edge_function(v0.x, v0.y, v1.x, v1.y, v2.x, v2.y);
    if area.abs() < 1e-6 { return; }
    let inv_area = 1.0 / area;

    if msaa {
        rasterize_triangle_msaa(fb, v0, v1, v2, color, texture, use_perspective, blend_mode, inv_area, ix0, iy0, ix1, iy1);
    } else {
        rasterize_triangle_no_msaa(fb, v0, v1, v2, color, texture, use_perspective, blend_mode, inv_area, ix0, iy0, ix1, iy1);
    }
}

fn rasterize_triangle_no_msaa(
    fb: &mut Framebuffer,
    v0: &TriangleVertex,
    v1: &TriangleVertex,
    v2: &TriangleVertex,
    color: Color,
    texture: Option<&Texture>,
    use_perspective: bool,
    blend_mode: u32,
    inv_area: f32,
    ix0: i32, iy0: i32, ix1: i32, iy1: i32,
) {
    for y in iy0..iy1 {
        for x in ix0..ix1 {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;

            let w0 = edge_function(v1.x, v1.y, v2.x, v2.y, px, py) * inv_area;
            let w1 = edge_function(v2.x, v2.y, v0.x, v0.y, px, py) * inv_area;
            let w2 = edge_function(v0.x, v0.y, v1.x, v1.y, px, py) * inv_area;

            if w0 < 0.0 || w1 < 0.0 || w2 < 0.0 { continue; }

            let pixel_color = if let Some(tex) = texture {
                let (u, v) = if use_perspective {
                    let inv_w = w0 / v0.w + w1 / v1.w + w2 / v2.w;
                    if inv_w.abs() < 1e-8 { continue; }
                    let one_over_w = 1.0 / inv_w;
                    let pu = (w0 * v0.u / v0.w + w1 * v1.u / v1.w + w2 * v2.u / v2.w) * one_over_w;
                    let pv = (w0 * v0.v / v0.w + w1 * v1.v / v1.w + w2 * v2.v / v2.w) * one_over_w;
                    (pu, pv)
                } else {
                    (w0 * v0.u + w1 * v1.u + w2 * v2.u,
                     w0 * v0.v + w1 * v1.v + w2 * v2.v)
                };
                let tc = tex.sample_linear(clampf(u, 0.0, 1.0), clampf(v, 0.0, 1.0));
                Color {
                    r: tc.r * color.r,
                    g: tc.g * color.g,
                    b: tc.b * color.b,
                    a: tc.a * color.a,
                }
            } else {
                color
            };

            fb.blend_pixel(x, y, pixel_color, blend_mode);
        }
    }
}

fn rasterize_triangle_msaa(
    fb: &mut Framebuffer,
    v0: &TriangleVertex,
    v1: &TriangleVertex,
    v2: &TriangleVertex,
    color: Color,
    texture: Option<&Texture>,
    use_perspective: bool,
    blend_mode: u32,
    inv_area: f32,
    ix0: i32, iy0: i32, ix1: i32, iy1: i32,
) {
    for y in iy0..iy1 {
        for x in ix0..ix1 {
            let mut coverage = 0u32;
            let mut acc_r = 0.0f32;
            let mut acc_g = 0.0f32;
            let mut acc_b = 0.0f32;
            let mut acc_a = 0.0f32;

            for &(ox, oy) in &MSAA_OFFSETS {
                let px = x as f32 + ox;
                let py = y as f32 + oy;

                let w0 = edge_function(v1.x, v1.y, v2.x, v2.y, px, py) * inv_area;
                let w1 = edge_function(v2.x, v2.y, v0.x, v0.y, px, py) * inv_area;
                let w2 = edge_function(v0.x, v0.y, v1.x, v1.y, px, py) * inv_area;

                if w0 < 0.0 || w1 < 0.0 || w2 < 0.0 { continue; }
                coverage += 1;

                if let Some(tex) = texture {
                    let (u, v) = if use_perspective {
                        let inv_w = w0 / v0.w + w1 / v1.w + w2 / v2.w;
                        if inv_w.abs() < 1e-8 { continue; }
                        let one_over_w = 1.0 / inv_w;
                        let pu = (w0 * v0.u / v0.w + w1 * v1.u / v1.w + w2 * v2.u / v2.w) * one_over_w;
                        let pv = (w0 * v0.v / v0.w + w1 * v1.v / v1.w + w2 * v2.v / v2.w) * one_over_w;
                        (pu, pv)
                    } else {
                        (w0 * v0.u + w1 * v1.u + w2 * v2.u,
                         w0 * v0.v + w1 * v1.v + w2 * v2.v)
                    };
                    let tc = tex.sample_linear(clampf(u, 0.0, 1.0), clampf(v, 0.0, 1.0));
                    acc_r += tc.r * color.r;
                    acc_g += tc.g * color.g;
                    acc_b += tc.b * color.b;
                    acc_a += tc.a * color.a;
                } else {
                    acc_r += color.r;
                    acc_g += color.g;
                    acc_b += color.b;
                    acc_a += color.a;
                }
            }

            if coverage == 0 { continue; }
            let inv_cov = 1.0 / coverage as f32;
            let pixel_color = Color {
                r: acc_r * inv_cov,
                g: acc_g * inv_cov,
                b: acc_b * inv_cov,
                a: acc_a * inv_cov,
            };
            fb.blend_pixel(x, y, pixel_color, blend_mode);
        }
    }
}

pub fn rasterize_polygon_scanline(
    fb: &mut Framebuffer,
    points: &[(f32, f32)],
    color: Color,
    blend_mode: u32,
) {
    if points.len() < 3 { return; }

    let mut min_y = f32::MAX;
    let mut max_y = f32::MIN;
    for &(_, y) in points {
        if y < min_y { min_y = y; }
        if y > max_y { max_y = y; }
    }

    let iy0 = clampi(min_y.floor() as i32, 0, fb.height as i32 - 1);
    let iy1 = clampi(max_y.ceil() as i32, 0, fb.height as i32);
    let n = points.len();

    for sy in iy0..iy1 {
        let scan_y = sy as f32 + 0.5;
        let mut intersections: Vec<f32> = Vec::new();

        for i in 0..n {
            let j = (i + 1) % n;
            let (x0, y0) = points[i];
            let (x1, y1) = points[j];

            if (y0 <= scan_y && y1 > scan_y) || (y1 <= scan_y && y0 > scan_y) {
                let t = (scan_y - y0) / (y1 - y0);
                intersections.push(x0 + t * (x1 - x0));
            }
        }

        intersections.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        let mut i = 0;
        while i + 1 < intersections.len() {
            let x_start = intersections[i];
            let x_end = intersections[i + 1];
            let sx0 = clampi(x_start.ceil() as i32, 0, fb.width as i32 - 1);
            let sx1 = clampi(x_end.floor() as i32 + 1, 0, fb.width as i32);

            for sx in sx0..sx1 {
                let px = sx as f32 + 0.5;
                if px >= x_start && px < x_end {
                    fb.blend_pixel(sx, sy, color, blend_mode);
                }
            }
            i += 2;
        }
    }
}

pub fn rasterize_polygon_msaa(
    fb: &mut Framebuffer,
    points: &[(f32, f32)],
    color: Color,
    blend_mode: u32,
) {
    if points.len() < 3 { return; }

    let mut min_x = f32::MAX;
    let mut min_y = f32::MAX;
    let mut max_x = f32::MIN;
    let mut max_y = f32::MIN;
    for &(x, y) in points {
        if x < min_x { min_x = x; }
        if y < min_y { min_y = y; }
        if x > max_x { max_x = x; }
        if y > max_y { max_y = y; }
    }

    let ix0 = clampi(min_x.floor() as i32, 0, fb.width as i32 - 1);
    let iy0 = clampi(min_y.floor() as i32, 0, fb.height as i32 - 1);
    let ix1 = clampi(max_x.ceil() as i32, 0, fb.width as i32);
    let iy1 = clampi(max_y.ceil() as i32, 0, fb.height as i32);
    let n = points.len();

    for y in iy0..iy1 {
        for x in ix0..ix1 {
            let mut coverage = 0u32;

            for &(spx, spy) in &MSAA_OFFSETS {
                let px = x as f32 + spx;
                let py = y as f32 + spy;

                let mut inside = true;
                for i in 0..n {
                    let j = (i + 1) % n;
                    let (x0, y0) = points[i];
                    let (x1, y1) = points[j];
                    let cross = (x1 - x0) * (py - y0) - (y1 - y0) * (px - x0);
                    if cross < 0.0 {
                        inside = false;
                        break;
                    }
                }

                if inside { coverage += 1; }
            }

            if coverage > 0 {
                let alpha = color.a * (coverage as f32 / 4.0);
                let pixel_color = Color { r: color.r, g: color.g, b: color.b, a: alpha };
                fb.blend_pixel(x, y, pixel_color, blend_mode);
            }
        }
    }
}
