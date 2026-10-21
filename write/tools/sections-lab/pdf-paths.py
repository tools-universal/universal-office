"""Caminhos (linhas) de um PDF com caixa, espessura e cor do traço — mede a
linha entre colunas que o Word desenha. Uso: python -I pdf-paths.py <pdf>"""
import ctypes
import sys
import pypdfium2 as pdfium
import pypdfium2.raw as raw

doc = pdfium.PdfDocument(sys.argv[1])
for i in range(len(doc)):
    page = doc[i]
    h = page.get_height()
    l, b, r, t = ctypes.c_float(), ctypes.c_float(), ctypes.c_float(), ctypes.c_float()
    w = ctypes.c_float()
    cr, cg, cb, ca = ctypes.c_uint(), ctypes.c_uint(), ctypes.c_uint(), ctypes.c_uint()
    for k in range(raw.FPDFPage_CountObjects(page.raw)):
        obj = raw.FPDFPage_GetObject(page.raw, k)
        if raw.FPDFPageObj_GetType(obj) != raw.FPDF_PAGEOBJ_PATH:
            continue
        raw.FPDFPageObj_GetBounds(obj, l, b, r, t)
        raw.FPDFPageObj_GetStrokeWidth(obj, w)
        raw.FPDFPageObj_GetStrokeColor(obj, cr, cg, cb, ca)
        segs = []
        for s in range(raw.FPDFPath_CountSegments(obj)):
            seg = raw.FPDFPath_GetPathSegment(obj, s)
            x, y = ctypes.c_float(), ctypes.c_float()
            raw.FPDFPathSegment_GetPoint(seg, x, y)
            segs.append((round(x.value, 2), round(h - y.value, 2)))
        print(f'p{i + 1} path x={l.value:.2f}..{r.value:.2f} y={h - t.value:.2f}..{h - b.value:.2f} w={w.value:.2f} rgb=({cr.value},{cg.value},{cb.value}) segs={segs}')
