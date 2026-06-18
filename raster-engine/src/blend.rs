use crate::math::Color;

#[inline(always)]
fn to_u8(v: f32) -> u8 {
    (v * 255.0 + 0.5).min(255.0).max(0.0) as u8
}

#[inline(always)]
pub fn blend_color(src: Color, dst: Color, mode: u32) -> Color {
    match mode {
        0 => alpha_blend(src, dst),
        1 => additive_blend(src, dst),
        2 => multiply_blend(src, dst),
        _ => alpha_blend(src, dst),
    }
}

#[inline(always)]
pub fn alpha_blend(src: Color, dst: Color) -> Color {
    let sa = src.a;
    let da = dst.a;
    let one_minus_sa = 1.0 - sa;
    let out_a = sa + da * one_minus_sa;
    if out_a < 1.0 / 255.0 {
        return Color::transparent();
    }
    Color {
        r: (src.r * sa + dst.r * da * one_minus_sa) / out_a,
        g: (src.g * sa + dst.g * da * one_minus_sa) / out_a,
        b: (src.b * sa + dst.b * da * one_minus_sa) / out_a,
        a: out_a,
    }
}

#[inline(always)]
pub fn additive_blend(src: Color, dst: Color) -> Color {
    Color {
        r: (src.r * src.a + dst.r * dst.a).min(1.0),
        g: (src.g * src.a + dst.g * dst.a).min(1.0),
        b: (src.b * src.a + dst.b * dst.a).min(1.0),
        a: (src.a + dst.a).min(1.0),
    }
}

#[inline(always)]
pub fn multiply_blend(src: Color, dst: Color) -> Color {
    let sa = src.a;
    let da = dst.a;
    let one_minus_sa = 1.0 - sa;
    let out_a = sa + da * one_minus_sa;
    if out_a < 1.0 / 255.0 {
        return Color::transparent();
    }
    Color {
        r: (src.r * dst.r * sa + dst.r * da * one_minus_sa) / out_a,
        g: (src.g * dst.g * sa + dst.g * da * one_minus_sa) / out_a,
        b: (src.b * dst.b * sa + dst.b * da * one_minus_sa) / out_a,
        a: out_a,
    }
}
