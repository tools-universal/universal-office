"""Campo de parâmetro dos ladrilhos de gradiente do Word (page-oracle7): para um
ladrilho vermelho→azul, converte cada pixel em g = fração de azul na mistura em
gama 2,2 e inverte a curva em S (normal acumulada σ=0,25) → p ∈ [0,1].
Imprime a grade p(x, y) (9×7) para achar a geometria de cada estilo/variante.

  python write/tools/page-lab/tile-field.py tl-1-1 tl-3-2 ...
"""
import math
import sys

from PIL import Image

D = 'E:/UniversalWriteTest/_lab/page/tiles/'


def phi(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


P0, P1 = phi(-2), phi(2)


def s_curve(t):
    return (phi((t - 0.5) / 0.25) - P0) / (P1 - P0)


def inv_s(g):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if s_curve(m) < g:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2


for name in sys.argv[1:]:
    im = Image.open(f'{D}{name}_arquivos/image001.png').convert('RGB')
    w, h = im.size
    print(f'## {name} {w}x{h}')
    for j in range(7):
        y = min(h - 1, round(j * (h - 1) / 6))
        row = []
        for i in range(9):
            x = min(w - 1, round(i * (w - 1) / 8))
            r, g, b = im.getpixel((x, y))
            lr, lb = (r / 255) ** 2.2, (b / 255) ** 2.2
            frac = lb / (lr + lb) if lr + lb > 0 else 0
            row.append(f'{inv_s(frac):.2f}')
        print('  ' + ' '.join(row))
