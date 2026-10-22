"""Rasteriza a 1ª página de dois PDFs (Word e nosso) a 96 ppp, recorta a região
(x0 y0 x1 y1 em pt) e grava uma imagem lado a lado: Word | nosso | |diferença|×4.
Imprime o erro médio por canal (0..255) e a fração de pixels com diferença > 48.
"""
import sys

import numpy as np
import pypdfium2 as pdfium
from PIL import Image


def page(path, dpi):
    pdf = pdfium.PdfDocument(path)
    try:
        return np.array(pdf[0].render(scale=dpi / 72).to_pil().convert('RGB')).astype(np.int16)
    finally:
        pdf.close()


def main():
    word_p, ours_p, out_p = sys.argv[1:4]
    x0, y0, x1, y1 = (float(v) for v in sys.argv[4:8])
    dpi = int(sys.argv[8]) if len(sys.argv) > 8 else 96
    s = dpi / 72
    a, b = page(word_p, dpi), page(ours_p, dpi)
    h = min(a.shape[0], b.shape[0]); w = min(a.shape[1], b.shape[1])
    X0, Y0 = max(0, int(x0 * s)), max(0, int(y0 * s))
    X1, Y1 = min(w, int(x1 * s)), min(h, int(y1 * s))
    a, b = a[Y0:Y1, X0:X1], b[Y0:Y1, X0:X1]
    d = np.abs(a - b)
    print('erro médio %.1f, >48: %.1f%%' % (d.mean(), 100 * (d.max(axis=2) > 48).mean()))
    side = np.concatenate([a, b, np.clip(d * 4, 0, 255)], axis=1).astype(np.uint8)
    Image.fromarray(side).save(out_p)


if __name__ == '__main__':
    main()
