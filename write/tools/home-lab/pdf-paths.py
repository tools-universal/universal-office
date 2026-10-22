"""Despeja o que o Word desenhou num PDF: linhas de texto (baseline) e os objetos
gráficos com a geometria (caminhos com os pontos já na página, preencher/traçar,
espessura, tracejado, cor; imagens com a caixa e os pixels). Origem no TOPO, em pt.

  python -I pdf-paths.py <pdf ou pasta> [saida.json]
"""
import ctypes
import json
import os
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as raw

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'corpus-lab'))
import pdftext  # noqa: E402

SEG = {raw.FPDF_SEGMENT_LINETO: 'l', raw.FPDF_SEGMENT_BEZIERTO: 'c', raw.FPDF_SEGMENT_MOVETO: 'm'}


def matrix(obj):
    m = raw.FS_MATRIX()
    if not raw.FPDFPageObj_GetMatrix(obj, ctypes.byref(m)):
        return (1, 0, 0, 1, 0, 0)
    return (m.a, m.b, m.c, m.d, m.e, m.f)


def color(fn, obj):
    r_, g, b, a = ctypes.c_uint(), ctypes.c_uint(), ctypes.c_uint(), ctypes.c_uint()
    if not fn(obj, r_, g, b, a):
        return None
    return '%02X%02X%02X' % (r_.value, g.value, b.value) + ('' if a.value == 255 else '/%d' % a.value)


def path_obj(obj, h, ctm=(1, 0, 0, 1, 0, 0)):
    a, b, c, d, e, f = mul(matrix(obj), ctm)
    segs = []
    x, y = ctypes.c_float(), ctypes.c_float()
    for i in range(raw.FPDFPath_CountSegments(obj)):
        s = raw.FPDFPath_GetPathSegment(obj, i)
        raw.FPDFPathSegment_GetPoint(s, x, y)
        px, py = a * x.value + c * y.value + e, b * x.value + d * y.value + f
        segs.append([SEG.get(raw.FPDFPathSegment_GetType(s), '?'), round(px, 3), round(h - py, 3)] + (['z'] if raw.FPDFPathSegment_GetClose(s) else []))
    fill, stroke = ctypes.c_int(), ctypes.c_int()
    raw.FPDFPath_GetDrawMode(obj, fill, stroke)
    w = ctypes.c_float()
    raw.FPDFPageObj_GetStrokeWidth(obj, w)
    out = {'t': 'path', 'segs': segs}
    if fill.value:
        out['fill'] = color(raw.FPDFPageObj_GetFillColor, obj)
    if stroke.value:
        out['stroke'] = color(raw.FPDFPageObj_GetStrokeColor, obj)
        # espessura em espaço de página (escala média da matriz)
        out['w'] = round(w.value * (abs(a * d - b * c) ** 0.5), 4)
        n = raw.FPDFPageObj_GetDashCount(obj)
        if n > 0:
            arr = (ctypes.c_float * n)()
            raw.FPDFPageObj_GetDashArray(obj, arr, n)
            out['dash'] = [round(v, 4) for v in arr]
            out['dashPhase'] = round(raw.FPDFPageObj_GetDashPhase(obj), 4)
        cap = raw.FPDFPageObj_GetLineCap(obj)
        out['cap'] = cap
    return out


def mul(m1, m2):
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (a1 * a2 + b1 * c2, a1 * b2 + b1 * d2, c1 * a2 + d1 * c2, c1 * b2 + d1 * d2,
            e1 * a2 + f1 * c2 + e2, e1 * b2 + f1 * d2 + f2)


def objects(page):
    h = page.get_height()
    out = []
    l, b, r_, t = ctypes.c_float(), ctypes.c_float(), ctypes.c_float(), ctypes.c_float()

    def walk(obj, ctm):
        typ = raw.FPDFPageObj_GetType(obj)
        if typ == raw.FPDF_PAGEOBJ_PATH:
            out.append(path_obj(obj, h, ctm))
        elif typ == raw.FPDF_PAGEOBJ_IMAGE:
            raw.FPDFPageObj_GetBounds(obj, l, b, r_, t)
            pw, ph = ctypes.c_uint(), ctypes.c_uint()
            raw.FPDFImageObj_GetImagePixelSize(obj, pw, ph)
            out.append({'t': 'image', 'x0': round(l.value, 3), 'y0': round(h - t.value, 3), 'x1': round(r_.value, 3), 'y1': round(h - b.value, 3), 'px': [pw.value, ph.value]})
        elif typ == raw.FPDF_PAGEOBJ_FORM:
            m = mul(matrix(obj), ctm)
            for i in range(raw.FPDFFormObj_CountObjects(obj)):
                walk(raw.FPDFFormObj_GetObject(obj, i), m)
        elif typ == raw.FPDF_PAGEOBJ_SHADING:
            raw.FPDFPageObj_GetBounds(obj, l, b, r_, t)
            out.append({'t': 'shading', 'x0': round(l.value, 3), 'y0': round(h - t.value, 3), 'x1': round(r_.value, 3), 'y1': round(h - b.value, 3)})

    for i in range(raw.FPDFPage_CountObjects(page.raw)):
        walk(raw.FPDFPage_GetObject(page.raw, i), (1, 0, 0, 1, 0, 0))
    return out


def dump(pdf_path):
    pdf = pdfium.PdfDocument(pdf_path)
    try:
        pages = []
        for i in range(len(pdf)):
            page = pdf[i]
            try:
                pages.append({'h': round(page.get_height(), 2), 'lines': pdftext.page_lines(page), 'objs': objects(page)})
            finally:
                page.close()
        return pages
    finally:
        pdf.close()


def main():
    src = sys.argv[1]
    files = [os.path.join(src, f) for f in sorted(os.listdir(src)) if f.endswith('.pdf')] if os.path.isdir(src) else [src]
    res = {os.path.basename(f)[:-4]: dump(f) for f in files}
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'w', encoding='utf8', newline='\n') as fh:
            json.dump(res, fh, ensure_ascii=False)
    else:
        json.dump(res, sys.stdout, ensure_ascii=False, indent=0)


if __name__ == '__main__':
    main()
