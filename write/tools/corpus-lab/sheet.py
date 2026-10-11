"""Folha de contato: para cada id, página N do Word | nosso (reduzidas), empilhadas.
Uso: python -I sheet.py <tag> <saida.png> id[:pag] id[:pag] ... [--source canvas|js|net] [--scale 0.5]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compare import LAB_DIR, pdf_pages_png  # noqa: E402


def load(p, shape=(1056, 816)):
    if p and os.path.exists(p):
        return Image.open(p).convert('L')
    return Image.new('L', (shape[1], shape[0]), 200)


def main():
    a = sys.argv[1:]

    def opt(n, d):
        if f'--{n}' in a:
            i = a.index(f'--{n}')
            v = a[i + 1]
            del a[i:i + 2]
            return v
        return d
    source = opt('source', 'canvas')
    scale = float(opt('scale', '0.5'))
    tag, out, ids = a[0], a[1], a[2:]
    rows = []
    for spec in ids:
        doc_id, _, pg = spec.partition(':')
        pg = int(pg or 1)
        w = load(os.path.join(LAB_DIR, 'word', doc_id, f'p{pg}.png'))
        odir = os.path.join(LAB_DIR, tag, doc_id)
        if source == 'canvas':
            o = load(os.path.join(odir, f'canvas-p{pg}.png'))
        else:
            pdf = os.path.join(odir, 'net.pdf' if source == 'net' else 'js.pdf')
            pngs = pdf_pages_png(pdf) if os.path.exists(pdf) else []
            o = load(pngs[pg - 1] if pg - 1 < len(pngs) else None)
        h = max(w.height, o.height)
        row = Image.new('L', (w.width + o.width + 8, h + 20), 120)
        row.paste(w, (0, 20))
        row.paste(o, (w.width + 8, 20))
        ImageDraw.Draw(row).text((4, 4), f'{doc_id} p{pg}  (Word | nosso {source})', fill=255)
        rows.append(row.resize((int(row.width * scale), int(row.height * scale)), Image.LANCZOS))
    W = max(r.width for r in rows)
    H = sum(r.height for r in rows)
    sheet = Image.new('L', (W, H), 60)
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    sheet.save(out)
    print(out)


if __name__ == '__main__':
    main()
