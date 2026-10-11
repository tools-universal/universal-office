"""Lado a lado para inspeção: Word | nosso | sobreposição (Word em vermelho,
nosso em azul, coincidência em preto). Grava LAB_DIR/view/<id>-<src>-p<N>.png.

Uso: python -I sbs.py <tag> <id> [página=1] [--source canvas|js|net] [--crop y0,y1]
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compare import LAB_DIR, pdf_pages_png  # noqa: E402


def main():
    args = sys.argv[1:]

    def opt(n, d=None):
        if f'--{n}' in args:
            i = args.index(f'--{n}')
            v = args[i + 1]
            del args[i:i + 2]
            return v
        return d
    source = opt('source', 'canvas')
    crop = opt('crop')
    scale = float(opt('scale', '1'))
    tag, doc_id = args[0], args[1]
    page = int(args[2]) if len(args) > 2 else 1
    wp = os.path.join(LAB_DIR, 'word', doc_id, f'p{page}.png')
    odir = os.path.join(LAB_DIR, tag, doc_id)
    if source == 'canvas':
        op = os.path.join(odir, f'canvas-p{page}.png')
    else:
        pngs = pdf_pages_png(os.path.join(odir, 'net.pdf' if source == 'net' else 'js.pdf'))
        op = pngs[page - 1] if page - 1 < len(pngs) else None
    a = np.array(Image.open(wp).convert('L')) if os.path.exists(wp) else np.full((1056, 816), 255, np.uint8)
    b = np.array(Image.open(op).convert('L')) if op and os.path.exists(op) else np.full_like(a, 255)
    h, w = max(a.shape[0], b.shape[0]), max(a.shape[1], b.shape[1])
    A = np.full((h, w), 255, np.uint8)
    B = np.full((h, w), 255, np.uint8)
    A[:a.shape[0], :a.shape[1]] = a
    B[:b.shape[0], :b.shape[1]] = b
    ov = np.stack([np.minimum(255, B.astype(int) * 1 + 0), np.minimum(A, B), A.astype(int)], axis=-1).astype(np.uint8)
    # vermelho = só Word (B claro, A escuro → R alto? ajusta): R=B, G=min, B=A
    sep = np.full((h, 6, 3), 128, np.uint8)
    rgbA = np.stack([A] * 3, -1)
    rgbB = np.stack([B] * 3, -1)
    out = np.concatenate([rgbA, sep, rgbB, sep, ov], axis=1)
    if crop:
        y0, y1 = (int(v) for v in crop.split(','))
        out = out[y0:y1]
    img = Image.fromarray(out)
    if scale != 1:
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    os.makedirs(os.path.join(LAB_DIR, 'view'), exist_ok=True)
    dst = os.path.join(LAB_DIR, 'view', f'{doc_id}-{source}-p{page}.png')
    img.save(dst)
    print(dst)


if __name__ == '__main__':
    main()
