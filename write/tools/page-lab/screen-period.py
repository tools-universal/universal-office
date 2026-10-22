"""Período do ladrilho do plano de fundo num print da tela do Word
(screen-probe.ps1): acha a página (região clara/colorida no fundo escuro) e mede
o período horizontal e vertical por autocorrelação de uma linha/coluna.

  python write/tools/page-lab/screen-period.py <png>...
"""
import sys

from PIL import Image


def dark(p):
    return max(p[:3]) < 60 and abs(p[0] - p[1]) < 20 and abs(p[1] - p[2]) < 20


def period(vals, lo=4, hi=None):
    n = len(vals)
    hi = hi or n // 2
    best = None
    for p in range(lo, hi):
        e = sum(sum(abs(a - b) for a, b in zip(vals[i], vals[i + p])) for i in range(0, n - p)) / max(1, n - p)
        if best is None or e < best[1]:
            best = (p, e)
    return best


for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    y0 = h // 2
    xs = [x for x in range(w) if not dark(im.getpixel((x, y0)))]
    x0 = min(xs) if xs else 0
    x1 = max(xs) if xs else w - 1
    xm = (x0 + x1) // 2
    ys = [y for y in range(30, h) if not dark(im.getpixel((xm, y)))]
    top = min(ys) if ys else 0
    bot = max(ys) if ys else h - 1
    row = [im.getpixel((x, min(bot - 2, top + 300))) for x in range(x0 + 2, x1 - 2)]
    col = [im.getpixel((x0 + 300 if x1 - x0 > 320 else xm, y)) for y in range(top + 2, bot - 2)]
    ph = period(row, 4, min(len(row) - 2, 1100))
    pv = period(col, 4, min(len(col) - 2, 900))
    name = path.replace('\\', '/').split('/')[-1]
    print(f'{name}: page x={x0}..{x1} ({x1 - x0 + 1}px) y={top}..{bot} ({bot - top + 1}px)  periodH={ph[0]} (err {ph[1]:.1f})  periodV={pv[0]} (err {pv[1]:.1f})')
