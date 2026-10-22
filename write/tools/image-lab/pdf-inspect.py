"""Inspeciona como o Word grava uma imagem no PDF: objetos da 1a pagina (imagem,
caminho, texto) com caixa em pontos, tamanho em pixels e mascara suave; com
--png, rasteriza a pagina (pdfium) numa resolucao dada e recorta a regiao.

  python tools/image-lab/pdf-inspect.py <pdf> [--png out.png --dpi 288 --box x0,y0,x1,y1]
"""
import ctypes
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as c

KIND = {c.FPDF_PAGEOBJ_TEXT: 'text', c.FPDF_PAGEOBJ_PATH: 'path', c.FPDF_PAGEOBJ_IMAGE: 'image',
        c.FPDF_PAGEOBJ_SHADING: 'shading', c.FPDF_PAGEOBJ_FORM: 'form'}


def walk(objs, depth, out):
    for o in objs:
        k = KIND.get(o.type, str(o.type))
        if k == 'text':
            continue
        L, B, R, T = (ctypes.c_float() for _ in range(4))
        c.FPDFPageObj_GetBounds(o.raw, L, B, R, T)
        l, b, r, t = L.value, B.value, R.value, T.value
        row = {'kind': k, 'depth': depth, 'box': [round(l, 2), round(b, 2), round(r, 2), round(t, 2)]}
        if k == 'image':
            try:
                w, h = o.get_size()
                row['px'] = [w, h]
            except Exception:
                pass
            try:
                md = o.get_metadata()
                row['bpc'] = md.bits_per_pixel
                row['cs'] = md.colorspace
            except Exception:
                pass
            try:
                row['filters'] = list(o.get_filters())
            except Exception:
                pass
        if k == 'form':
            walk(o.get_objects(), depth + 1, out)
        out.append(row)


def main():
    args = sys.argv[1:]
    path = args[0]
    pdf = pdfium.PdfDocument(path)
    page = pdf[0]
    W, H = page.get_size()
    print(f'pagina {W:.2f}x{H:.2f} pt')
    rows = []
    walk(page.get_objects(), 0, rows)
    for r in rows:
        if r['kind'] == 'text':
            continue
        print(('  ' * r['depth']) + r['kind'], r['box'], *(f'{k}={r[k]}' for k in ('px', 'bpc', 'cs', 'filters') if k in r))
    if '--png' in args:
        out = args[args.index('--png') + 1]
        dpi = float(args[args.index('--dpi') + 1]) if '--dpi' in args else 288
        img = page.render(scale=dpi / 72).to_pil()
        if '--box' in args:
            x0, y0, x1, y1 = (float(v) for v in args[args.index('--box') + 1].split(','))
            s = dpi / 72
            img = img.crop((int(x0 * s), int((H - y1) * s), int(x1 * s), int((H - y0) * s)))
        img.save(out)
        print('png', out, img.size)


if __name__ == '__main__':
    main()
