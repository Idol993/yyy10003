use crate::math::Color;
use crate::buffer::Framebuffer;
use crate::raster::rasterize_polygon_msaa;
use std::collections::BTreeMap;

pub struct Font {
    pub scale: f32,
    glyphs: BTreeMap<u32, Glyph>,
    units_per_em: u16,
    ascent: i16,
    descent: i16,
    line_gap: i16,
}

#[derive(Clone)]
struct Glyph {
    advance_width: f32,
    left_bearing: f32,
    contours: Vec<Contour>,
}

#[derive(Clone)]
struct Contour {
    points: Vec<GlyphPoint>,
}

#[derive(Clone)]
struct GlyphPoint {
    x: f32,
    y: f32,
    on_curve: bool,
}

impl Font {
    pub fn parse(data: &[u8]) -> Result<Font, &'static str> {
        if data.len() < 12 {
            return Err("TTF too small");
        }

        let num_tables = read_u16(data, 4);
        let mut table_offsets: BTreeMap<[u8; 4], usize> = BTreeMap::new();

        for i in 0..num_tables as usize {
            let offset = 12 + i * 16;
            if offset + 16 > data.len() { break; }
            let tag = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
            let table_offset = read_u32(data, offset + 8) as usize;
            table_offsets.insert(tag, table_offset);
        }

        let head_off = *table_offsets.get(&[b'h', b'e', b'a', b'd']).ok_or("missing head table")?;
        let units_per_em = read_u16(data, head_off + 18);

        let hhea_off = *table_offsets.get(&[b'h', b'h', b'e', b'a']).ok_or("missing hhea table")?;
        let ascent = read_i16(data, hhea_off + 4);
        let descent = read_i16(data, hhea_off + 6);
        let line_gap = read_i16(data, hhea_off + 8);
        let num_h_metrics = read_u16(data, hhea_off + 34) as usize;

        let hmtx_off = *table_offsets.get(&[b'h', b'm', b't', b'x']).ok_or("missing hmtx table")?;
        let maxp_off = *table_offsets.get(&[b'm', b'a', b'x', b'p']).ok_or("missing maxp table")?;
        let num_glyphs = read_u16(data, maxp_off + 4) as usize;

        let cmap_off = *table_offsets.get(&[b'c', b'm', b'a', b'p']).ok_or("missing cmap table")?;
        let cmap = parse_cmap(data, cmap_off)?;

        let loca_off = *table_offsets.get(&[b'l', b'o', b'c', b'a']).ok_or("missing loca table")?;
        let glyf_off = *table_offsets.get(&[b'g', b'l', b'y', b'f']).ok_or("missing glyf table")?;
        let index_to_loc_format = read_i16(data, head_off + 50);

        let mut glyphs = BTreeMap::new();

        for (&code_point, &glyph_idx) in &cmap {
            if glyph_idx as usize >= num_glyphs { continue; }

            let glyph_offset = get_glyph_offset(data, loca_off, glyph_idx as usize, index_to_loc_format);

            let advance_width = if (glyph_idx as usize) < num_h_metrics {
                read_u16(data, hmtx_off + glyph_idx as usize * 4) as f32
            } else if num_h_metrics > 0 {
                read_u16(data, hmtx_off + (num_h_metrics - 1) * 4) as f32
            } else {
                0.0
            };

            let lsb = if (glyph_idx as usize) < num_h_metrics {
                read_i16(data, hmtx_off + glyph_idx as usize * 4 + 2) as f32
            } else {
                let lsb_offset = hmtx_off + num_h_metrics * 4 + ((glyph_idx as usize) - num_h_metrics) * 2;
                if lsb_offset + 2 <= data.len() {
                    read_i16(data, lsb_offset) as f32
                } else {
                    0.0
                }
            };

            let contours = if glyph_offset == 0 {
                Vec::new()
            } else {
                parse_glyph(data, glyf_off + glyph_offset).unwrap_or_default()
            };

            glyphs.insert(code_point, Glyph {
                advance_width,
                left_bearing: lsb,
                contours,
            });
        }

        Ok(Font {
            scale: 1.0,
            glyphs,
            units_per_em,
            ascent,
            descent,
            line_gap,
        })
    }

    pub fn set_size(&mut self, size_px: f32) {
        self.scale = size_px / self.units_per_em as f32;
    }

    pub fn draw_text(
        &self,
        fb: &mut Framebuffer,
        text: &str,
        mut x: f32,
        y: f32,
        color: Color,
        blend_mode: u32,
    ) -> f32 {
        let base_y = y - self.ascent as f32 * self.scale;

        for ch in text.chars() {
            let code_point = ch as u32;
            if let Some(glyph) = self.glyphs.get(&code_point) {
                for contour in &glyph.contours {
                    if contour.points.len() < 2 { continue; }

                    let mut poly_points: Vec<(f32, f32)> = Vec::new();
                    let mut i = 0;
                    let n = contour.points.len();

                    while i < n {
                        let p0 = &contour.points[i];
                        if p0.on_curve {
                            poly_points.push((x + p0.x * self.scale, base_y - p0.y * self.scale));
                            i += 1;
                        } else {
                            let prev = if i > 0 { &contour.points[i - 1] } else { &contour.points[n - 1] };
                            let next = if i + 1 < n { &contour.points[i + 1] } else { &contour.points[0] };

                            if !next.on_curve {
                                let mid_x = (p0.x + next.x) * 0.5;
                                let mid_y = (p0.y + next.y) * 0.5;
                                for s in 1..=4u32 {
                                    let t = s as f32 / 4.0;
                                    let bx = (1.0 - t).powi(2) * prev.x + 2.0 * (1.0 - t) * t * p0.x + t * t * mid_x;
                                    let by = (1.0 - t).powi(2) * prev.y + 2.0 * (1.0 - t) * t * p0.y + t * t * mid_y;
                                    poly_points.push((x + bx * self.scale, base_y - by * self.scale));
                                }
                                i += 1;
                            } else {
                                for s in 1..=4u32 {
                                    let t = s as f32 / 4.0;
                                    let bx = (1.0 - t).powi(2) * prev.x + 2.0 * (1.0 - t) * t * p0.x + t * t * next.x;
                                    let by = (1.0 - t).powi(2) * prev.y + 2.0 * (1.0 - t) * t * p0.y + t * t * next.y;
                                    poly_points.push((x + bx * self.scale, base_y - by * self.scale));
                                }
                                i += 2;
                            }
                        }
                    }

                    if poly_points.len() >= 3 {
                        rasterize_polygon_msaa(fb, &poly_points, color, blend_mode);
                    }
                }

                x += glyph.advance_width * self.scale;
            } else {
                x += self.units_per_em as f32 * self.scale * 0.5;
            }
        }

        x
    }

    pub fn measure_text(&self, text: &str) -> f32 {
        let mut width = 0.0f32;
        for ch in text.chars() {
            if let Some(glyph) = self.glyphs.get(&(ch as u32)) {
                width += glyph.advance_width * self.scale;
            } else {
                width += self.units_per_em as f32 * self.scale * 0.5;
            }
        }
        width
    }

    pub fn line_height(&self) -> f32 {
        (self.ascent - self.descent + self.line_gap) as f32 * self.scale
    }
}

fn parse_cmap(data: &[u8], cmap_off: usize) -> Result<BTreeMap<u32, u16>, &'static str> {
    let mut result = BTreeMap::new();
    let num_subtables = read_u16(data, cmap_off + 2) as usize;

    for i in 0..num_subtables {
        let sub_off = cmap_off + 4 + i * 8;
        if sub_off + 8 > data.len() { break; }
        let platform_id = read_u16(data, sub_off);
        let offset = read_u32(data, sub_off + 4) as usize;

        if platform_id != 0 && platform_id != 3 { continue; }

        let sub_table_off = cmap_off + offset;
        if sub_table_off + 2 > data.len() { continue; }
        let format = read_u16(data, sub_table_off);

        if format == 4 {
            parse_cmap_format4(data, sub_table_off, &mut result)?;
        }
    }

    Ok(result)
}

fn parse_cmap_format4(
    data: &[u8],
    off: usize,
    result: &mut BTreeMap<u32, u16>,
) -> Result<(), &'static str> {
    if off + 14 > data.len() { return Err("cmap format4 too small"); }
    let seg_count = read_u16(data, off + 6) as usize / 2;

    let end_off = off + 14;
    let start_off = end_off + seg_count * 2 + 2;
    let delta_off = start_off + seg_count * 2;
    let range_off = delta_off + seg_count * 2;

    for i in 0..seg_count {
        let end_code = read_u16(data, end_off + i * 2) as u32;
        let start_code = read_u16(data, start_off + i * 2) as u32;
        let delta = read_i16(data, delta_off + i * 2) as i32;
        let range_offset = read_u16(data, range_off + i * 2) as usize;

        for code in start_code..=end_code {
            if code == 0xFFFF { break; }
            let glyph_idx = if range_offset == 0 {
                ((code as i32 + delta) & 0xFFFF) as u16
            } else {
                let addr = range_off + i * 2 + range_offset + (code - start_code) as usize * 2;
                if addr + 2 <= data.len() {
                    read_u16(data, addr)
                } else {
                    0
                }
            };
            if glyph_idx != 0 {
                result.insert(code, glyph_idx);
            }
        }
    }

    Ok(())
}

fn get_glyph_offset(data: &[u8], loca_off: usize, glyph_idx: usize, index_to_loc_format: i16) -> usize {
    if index_to_loc_format == 0 {
        let off = loca_off + glyph_idx * 2;
        if off + 2 > data.len() { return 0; }
        read_u16(data, off) as usize * 2
    } else {
        let off = loca_off + glyph_idx * 4;
        if off + 4 > data.len() { return 0; }
        read_u32(data, off) as usize
    }
}

fn parse_glyph(data: &[u8], off: usize) -> Result<Vec<Contour>, &'static str> {
    if off + 10 > data.len() { return Err("glyph data too small"); }

    let num_contours = read_i16(data, off);

    if num_contours <= 0 {
        return Ok(Vec::new());
    }

    let n = num_contours as usize;
    let mut end_pts = Vec::with_capacity(n);
    for i in 0..n {
        let p = off + 10 + i * 2;
        if p + 2 > data.len() { return Err("endPts overflow"); }
        end_pts.push(read_u16(data, p) as usize);
    }

    let total_points = end_pts.last().copied().unwrap_or(0) + 1;
    let inst_off = off + 10 + n * 2;
    if inst_off + 2 > data.len() { return Err("inst overflow"); }
    let inst_len = read_u16(data, inst_off) as usize;
    let flags_off = inst_off + 2 + inst_len;

    let mut flags = Vec::with_capacity(total_points);
    let mut pos = flags_off;
    let mut parsed = 0;
    while parsed < total_points {
        if pos >= data.len() { break; }
        let f = data[pos];
        pos += 1;
        flags.push(f);
        parsed += 1;
        if f & 0x08 != 0 {
            if pos >= data.len() { break; }
            let repeat = data[pos] as usize;
            pos += 1;
            for _ in 0..repeat {
                flags.push(f);
                parsed += 1;
            }
        }
    }

    let mut x_coords = Vec::with_capacity(total_points);
    let mut x_pos = pos;
    let mut x_acc: i32 = 0;
    for i in 0..parsed {
        if i >= flags.len() { break; }
        let f = flags[i];
        if f & 0x02 != 0 {
            if x_pos >= data.len() { break; }
            let dx = data[x_pos] as i32;
            x_pos += 1;
            x_acc += if f & 0x10 != 0 { dx } else { -dx };
        } else if f & 0x10 == 0 {
            if x_pos + 2 > data.len() { break; }
            x_acc += read_i16_raw(data, x_pos) as i32;
            x_pos += 2;
        }
        x_coords.push(x_acc as f32);
    }

    let mut y_coords = Vec::with_capacity(total_points);
    let mut y_pos = x_pos;
    let mut y_acc: i32 = 0;
    for i in 0..parsed {
        if i >= flags.len() { break; }
        let f = flags[i];
        if f & 0x04 != 0 {
            if y_pos >= data.len() { break; }
            let dy = data[y_pos] as i32;
            y_pos += 1;
            y_acc += if f & 0x20 != 0 { dy } else { -dy };
        } else if f & 0x20 == 0 {
            if y_pos + 2 > data.len() { break; }
            y_acc += read_i16_raw(data, y_pos) as i32;
            y_pos += 2;
        }
        y_coords.push(y_acc as f32);
    }

    let mut contours = Vec::new();
    let mut start = 0;
    for &end in &end_pts {
        let mut points = Vec::new();
        for i in start..=end.min(&(x_coords.len() - 1)) {
            points.push(GlyphPoint {
                x: x_coords[i],
                y: y_coords[i],
                on_curve: (flags[i] & 0x01) != 0,
            });
        }
        if !points.is_empty() {
            contours.push(Contour { points });
        }
        start = end + 1;
    }

    Ok(contours)
}

#[inline(always)]
fn read_u16(data: &[u8], off: usize) -> u16 {
    if off + 2 > data.len() { return 0; }
    ((data[off] as u16) << 8) | (data[off + 1] as u16)
}

#[inline(always)]
fn read_i16(data: &[u8], off: usize) -> i16 {
    read_u16(data, off) as i16
}

#[inline(always)]
fn read_i16_raw(data: &[u8], off: usize) -> i16 {
    if off + 2 > data.len() { return 0; }
    ((data[off] as i16) << 8) | (data[off + 1] as i16)
}

#[inline(always)]
fn read_u32(data: &[u8], off: usize) -> u32 {
    if off + 4 > data.len() { return 0; }
    ((data[off] as u32) << 24) | ((data[off + 1] as u32) << 16) | ((data[off + 2] as u32) << 8) | (data[off + 3] as u32)
}
