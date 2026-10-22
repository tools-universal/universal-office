"""Lado a lado (Word | nosso | diferença) da 1ª página de PDFs com o mesmo nome em
E:\\UniversalWriteTest\\_lab\\page\\pdf (Word) e ...\\ours (motor), a uma resolução dada.
Imprime a diferença média/máxima e grava sbs-<nome>.png na pasta png.

  python write/tools/page-lab/pdf-sbs.py [--dpi 36] nome...
"""
import sys

import pypdfium2 as pdfium
from PIL import Image, ImageChops

LAB = 'E:/UniversalWriteTest/_lab/page/'
args = sys.argv[1:]
dpi = 36.0
if args and args[0] == '--dpi':
    dpi = float(args[1])
    args = args[2:]


def render(path):
    page = pdfium.PdfDocument(path)[0]
    return page.render(scale=dpi / 72.0).to_pil().convert('RGB')


for name in args:
    a = render(f'{LAB}pdf/{name}.pdf')
    b = render(f'{LAB}ours/{name}.pdf')
    if b.size != a.size:
        b = b.resize(a.size)
    d = ImageChops.difference(a, b)
    px = list(d.getdata())
    mean = sum(sum(p) for p in px) / (len(px) * 3)
    mx = max(max(p) for p in px)
    out = Image.new('RGB', (a.width * 3 + 20, a.height), 'white')
    out.paste(a, (0, 0))
    out.paste(b, (a.width + 10, 0))
    out.paste(d.point(lambda v: min(255, v * 3)), (2 * a.width + 20, 0))
    out.save(f'{LAB}png/sbs-{name}.png')
    print(f'{name}: mean={mean:.2f} max={mx}')
