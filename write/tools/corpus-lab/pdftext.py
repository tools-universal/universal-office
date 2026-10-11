"""Extração de linhas de texto e raster de um PDF (pdfium) — usado igual para o
PDF do Word e para os NOSSOS PDFs (JS e .NET), para a comparação ser simétrica.

Linha = sequência de caracteres (na ordem do content stream) com o mesmo
baseline e x crescente; espaços/quebras são ignorados no texto (o Word
posiciona palavras sem glifo de espaço em parte dos casos; o nosso writer
nunca emite espaço), então a comparação é por texto SEM brancos.
"""
import ctypes
import json
import sys

import numpy as np
import pypdfium2 as pdfium
import pypdfium2.raw as raw

# Caracteres que o Word troca por glifos de fontes de símbolo (marcadores de
# lista: Symbol/Wingdings usam a área privada F0xx); normalizamos para o
# mesmo marcador para a comparação de texto não penalizar só a codificação.
_PUA_BULLETS = {0xF0B7, 0xF0A7, 0xF0D8, 0xF0FC, 0xF076, 0xF0A8, 0xF06E, 0xF0E0, 0xF0A1}
_BULLETS = {0x2022, 0x25AA, 0x25CF, 0x25E6, 0x2023, 0x2043, 0x25A0, 0x25A1, 0x2219, 0x00B7, 0x27A2, 0x2713, 0x2714, 0x25C6, 0x25C7, 0x2756, 0x00A7, 0x2192, 0x27A4}


def _norm_char(cp):
    if cp in _PUA_BULLETS or cp in _BULLETS:
        return '•'
    if 0xF020 <= cp <= 0xF0FF:  # demais símbolos da área privada (Symbol/Wingdings)
        return '•'
    if cp in (0x00A0, 0x2007, 0x202F):
        return ' '
    if cp in (0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2212, 0x00AD):
        return '-' if cp != 0x00AD else ''
    if cp in (0x2018, 0x2019, 0x201A, 0x2032):
        return "'"
    if cp in (0x201C, 0x201D, 0x201E, 0x2033):
        return '"'
    if cp == 0x2026:
        return '...'
    if cp in (0xFB01,):
        return 'fi'
    if cp in (0xFB02,):
        return 'fl'
    try:
        return chr(cp)
    except ValueError:
        return ''


def page_lines(page):
    """Linhas de uma página: [{y, x0, x1, size, text}] em pontos, origem no TOPO."""
    tp = page.get_textpage()
    try:
        n = tp.count_chars()
        h = page.get_height()
        lines = []
        cur = None
        ox, oy = ctypes.c_double(), ctypes.c_double()
        l, b, r, t = ctypes.c_double(), ctypes.c_double(), ctypes.c_double(), ctypes.c_double()
        for i in range(n):
            if raw.FPDFText_IsGenerated(tp.raw, i) == 1:
                continue
            cp = raw.FPDFText_GetUnicode(tp.raw, i)
            if 0xD800 <= cp <= 0xDFFF:  # metade de par substituto (emoji etc.)
                continue
            ch = _norm_char(cp)
            if not ch or ch.isspace() or cp < 32:
                continue
            raw.FPDFText_GetCharOrigin(tp.raw, i, ox, oy)
            raw.FPDFText_GetCharBox(tp.raw, i, l, r, b, t)
            size = raw.FPDFText_GetFontSize(tp.raw, i)
            x, y = ox.value, h - oy.value
            right = max(r.value, x)
            tol = max(1.0, 0.3 * (size or 10))
            if cur is not None and abs(y - cur['y']) <= tol and x >= cur['x1'] - tol * 2:
                cur['text'] += ch
                cur['x1'] = max(cur['x1'], right)
                cur['size'] = max(cur['size'], size)
            else:
                cur = {'y': y, 'x0': x, 'x1': right, 'size': size, 'text': ch}
                lines.append(cur)
        for ln in lines:
            ln['y'] = round(ln['y'], 2)
            ln['x0'] = round(ln['x0'], 2)
            ln['x1'] = round(ln['x1'], 2)
            ln['size'] = round(ln['size'], 2)
        return lines
    finally:
        tp.close()


_OBJ_TYPES = {raw.FPDF_PAGEOBJ_PATH: 'path', raw.FPDF_PAGEOBJ_IMAGE: 'image', raw.FPDF_PAGEOBJ_SHADING: 'shading', raw.FPDF_PAGEOBJ_FORM: 'form'}


def page_objects(page):
    """Objetos gráficos (sem texto): tipo + caixa (pt, origem no topo)."""
    h = page.get_height()
    out = []
    n = raw.FPDFPage_CountObjects(page.raw)
    l, b, r, t = ctypes.c_float(), ctypes.c_float(), ctypes.c_float(), ctypes.c_float()
    for i in range(n):
        obj = raw.FPDFPage_GetObject(page.raw, i)
        typ = _OBJ_TYPES.get(raw.FPDFPageObj_GetType(obj))
        if not typ:
            continue
        if not raw.FPDFPageObj_GetBounds(obj, l, b, r, t):
            continue
        out.append({'t': typ, 'x0': round(l.value, 2), 'y0': round(h - t.value, 2), 'x1': round(r.value, 2), 'y1': round(h - b.value, 2)})
    return out


def extract(pdf_path, objects=False):
    pdf = pdfium.PdfDocument(pdf_path)
    try:
        pages = []
        for i in range(len(pdf)):
            page = pdf[i]
            try:
                w, h = page.get_size()
                pg = {'w': round(w, 2), 'h': round(h, 2), 'lines': page_lines(page)}
                if objects:
                    pg['objs'] = page_objects(page)
                pages.append(pg)
            finally:
                page.close()
        return {'pages': pages}
    finally:
        pdf.close()


def render(pdf_path, dpi=96, max_pages=None):
    """Páginas como arrays uint8 em tons de cinza."""
    pdf = pdfium.PdfDocument(pdf_path)
    out = []
    try:
        n = len(pdf) if max_pages is None else min(len(pdf), max_pages)
        for i in range(n):
            page = pdf[i]
            try:
                bm = page.render(scale=dpi / 72, grayscale=True)
                out.append(np.array(bm.to_pil().convert('L')))
            finally:
                page.close()
    finally:
        pdf.close()
    return out


if __name__ == '__main__':
    data = extract(sys.argv[1])
    for pi, p in enumerate(data['pages']):
        print(f"--- página {pi + 1} ({p['w']}x{p['h']}) {len(p['lines'])} linhas")
        for ln in p['lines'][: int(sys.argv[2]) if len(sys.argv) > 2 else 15]:
            print(f"  y={ln['y']:7.2f} x={ln['x0']:7.2f}..{ln['x1']:7.2f} sz={ln['size']:5.2f} {ln['text'][:90]}")
