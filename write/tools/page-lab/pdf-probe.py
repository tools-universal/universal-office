"""Amostra cores de PDFs do oráculo: rasteriza a 1ª página (pdfium) e imprime a
cor em pontos dados (em pt, origem no topo-esquerdo) e um resumo dos objetos.

  python write/tools/page-lab/pdf-probe.py <pdf> [--dpi 72] [--pts x,y;x,y...] [--png out.png]
"""
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as c

args = sys.argv[1:]
path = args[0]
dpi = 72.0
pts = '5,5;297,5;590,5;5,420;297,420;5,836;297,836;590,836'
png = None
i = 1
while i < len(args):
    if args[i] == '--dpi':
        dpi = float(args[i + 1]); i += 2
    elif args[i] == '--pts':
        pts = args[i + 1]; i += 2
    elif args[i] == '--png':
        png = args[i + 1]; i += 2
    else:
        i += 1

pdf = pdfium.PdfDocument(path)
page = pdf[0]
w, h = page.get_size()
img = page.render(scale=dpi / 72.0).to_pil().convert('RGB')
kinds = {}
for o in page.get_objects():
    kinds[o.type] = kinds.get(o.type, 0) + 1
names = {c.FPDF_PAGEOBJ_TEXT: 'text', c.FPDF_PAGEOBJ_PATH: 'path', c.FPDF_PAGEOBJ_IMAGE: 'image', c.FPDF_PAGEOBJ_SHADING: 'shading', c.FPDF_PAGEOBJ_FORM: 'form'}
print(f'page {w:.1f}x{h:.1f} objs ' + ' '.join(f'{names.get(k, k)}={v}' for k, v in kinds.items()))
for p in pts.split(';'):
    x, y = (float(v) for v in p.split(','))
    px = img.getpixel((min(img.width - 1, int(x * dpi / 72)), min(img.height - 1, int(y * dpi / 72))))
    print(f'  ({x:g},{y:g}) #{px[0]:02X}{px[1]:02X}{px[2]:02X}')
if png:
    img.save(png)
