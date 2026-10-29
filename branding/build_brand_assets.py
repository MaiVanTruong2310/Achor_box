"""Builds the Anchor Box brand assets from the reference logo.

Usage (from a venv with pillow, numpy and vtracer):
    python build_brand_assets.py <work_dir>

Traces the hand-inked logo into colorable SVGs and renders the PNG assets
used by the Flutter app (logos, launcher icons, web icons).
"""
import os
import re
import sys

import numpy as np
import vtracer
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'app')
SOURCE = os.path.join(HERE, 'source', 'anchor_box_logo_reference.png')

NAVY = (11, 31, 58)
WHITE = (255, 255, 255)
INK = (28, 28, 30)
COLORS = {'navy': NAVY, 'white': WHITE, 'black': INK}

SCALE = 8
REGIONS = {
    'anchor_mark': (150, 48, 290, 224),
    'logo_stacked': (43, 48, 392, 350),
}


def ink_mask(box):
    """High-resolution mask of the logo region: 255 = ink, 0 = paper."""
    image = Image.open(SOURCE).convert('RGBA')
    paper = Image.new('RGBA', image.size, (249, 249, 249, 255))
    paper.alpha_composite(image)
    crop = paper.convert('L').crop(box)
    big = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.LANCZOS)
    big = big.filter(ImageFilter.GaussianBlur(SCALE * 0.35))
    ink = big.point(lambda v: 255 if v < 140 else 0, 'L')
    bbox = ink.getbbox()
    return ink.crop(bbox)


def trace(mask, work, name):
    tmp_png = os.path.join(work, f'{name}_trace_input.png')
    tmp_svg = os.path.join(work, f'{name}_traced.svg')
    Image.eval(mask, lambda v: 255 - v).save(tmp_png)
    vtracer.convert_image_to_svg_py(
        tmp_png, tmp_svg, colormode='binary', mode='spline',
        filter_speckle=6, corner_threshold=60, length_threshold=4.0,
        max_iterations=10, splice_threshold=45, path_precision=2)
    body = open(tmp_svg, encoding='utf-8').read()
    paths = re.findall(r'<path[^>]*/>', body)
    return mask.width, mask.height, paths


def write_svgs(name, width, height, paths, out_dir):
    for color_name, rgb in COLORS.items():
        hex_color = '#%02X%02X%02X' % rgb
        colored = [re.sub(r'fill="[^"]*"', f'fill="{hex_color}"', p) for p in paths]
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'role="img" aria-label="Anchor Box">\n' + '\n'.join(colored) + '\n</svg>\n'
        )
        with open(os.path.join(out_dir, f'{name}_{color_name}.svg'), 'w', encoding='utf-8') as f:
            f.write(svg)


def tinted(mask, rgb, height=None, width=None):
    if height:
        size = (round(mask.width * height / mask.height), height)
    elif width:
        size = (width, round(mask.height * width / mask.width))
    else:
        size = mask.size
    alpha = mask.resize(size, Image.LANCZOS)
    layer = Image.new('RGBA', size, rgb + (0,))
    layer.putalpha(alpha)
    return layer


def icon(mark, canvas, mark_height, background=NAVY, optical_lift=0.02):
    image = Image.new('RGBA', (canvas, canvas), background + (255,) if background else (0, 0, 0, 0))
    glyph = tinted(mark, WHITE, height=mark_height)
    x = (canvas - glyph.width) // 2
    y = (canvas - glyph.height) // 2 - round(canvas * optical_lift)
    image.alpha_composite(glyph, (x, y))
    return image


def main(work):
    os.makedirs(work, exist_ok=True)
    svg_dir = os.path.join(HERE, 'svg')
    png_dir = os.path.join(HERE, 'png')
    os.makedirs(svg_dir, exist_ok=True)
    os.makedirs(png_dir, exist_ok=True)

    masks = {name: ink_mask(box) for name, box in REGIONS.items()}
    for name, mask in masks.items():
        width, height, paths = trace(mask, work, name)
        write_svgs(name, width, height, paths, svg_dir)

    mark, stacked = masks['anchor_mark'], masks['logo_stacked']
    for color_name, rgb in COLORS.items():
        tinted(mark, rgb, height=1024).save(os.path.join(png_dir, f'anchor_mark_{color_name}.png'))
        tinted(stacked, rgb, width=1600).save(os.path.join(png_dir, f'logo_stacked_{color_name}.png'))

    logos = os.path.join(APP, 'assets', 'logos')
    tinted(mark, WHITE, height=512).save(os.path.join(logos, 'anchor_mark_white.png'))
    tinted(mark, NAVY, height=512).save(os.path.join(logos, 'anchor_mark_navy.png'))
    tinted(stacked, WHITE, width=1200).save(os.path.join(logos, 'logo_stacked_white.png'))
    tinted(stacked, NAVY, width=1200).save(os.path.join(logos, 'logo_stacked_navy.png'))

    icons = os.path.join(APP, 'assets', 'icons')
    icon(mark, 1024, 600).convert('RGB').save(os.path.join(icons, 'app_icon.png'))
    icon(mark, 1024, 470, background=None).save(os.path.join(icons, 'app_icon_foreground.png'))

    web = os.path.join(APP, 'web')
    icon(mark, 192, 112).convert('RGB').save(os.path.join(web, 'icons', 'Icon-192.png'))
    icon(mark, 512, 300).convert('RGB').save(os.path.join(web, 'icons', 'Icon-512.png'))
    icon(mark, 192, 92, optical_lift=0.01).convert('RGB').save(
        os.path.join(web, 'icons', 'Icon-maskable-192.png'))
    icon(mark, 512, 245, optical_lift=0.01).convert('RGB').save(
        os.path.join(web, 'icons', 'Icon-maskable-512.png'))
    icon(mark, 64, 46, optical_lift=0).convert('RGB').resize((32, 32), Image.LANCZOS).save(
        os.path.join(web, 'favicon.png'))

    print('mark mask', mark.size, 'stacked mask', stacked.size)


if __name__ == '__main__':
    main(sys.argv[1])
