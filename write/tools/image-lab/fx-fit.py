"""Mede o desenho dos efeitos no PDF do Word: para cada experimento, pega a
camada do efeito (a imagem com mascara suave), a posicao dela e a da imagem, e
ajusta o perfil de alfa na borda esquerda (linha do meio) a uma curva normal
acumulada: alfa(d) = A * Phi((c - d) / s), d = distancia (pt) PARA FORA da
borda da imagem (negativa = para dentro). Imprime A, c (pt) e s (pt).

  python tools/image-lab/fx-fit.py <nome> [<nome>...]
"""
import ctypes
import math
import re
import sys
import zlib

import numpy as np
import pypdfium2 as pdfium
import pypdfium2.raw as c


def images(path):
    """Imagens do PDF: (num, w, h, gray?, smask_num, pixels)."""
    b = open(path, 'rb').read()
    out = {}
    for m in re.finditer(rb'(\d+) 0 obj\s*(<<.*?>>)\s*stream\r?\n', b, re.S):
        num = int(m.group(1)); d = m.group(2)
        if b'/Subtype/Image' not in d.replace(b' ', b''):
            continue
        ln = re.search(rb'/Length\s+(\d+)(\s+0\s+R)?', d)
        start = m.end()
        data = b[start:start + int(ln.group(1))] if ln and not ln.group(2) else b[start:b.find(b'endstream', start)].rstrip(b'\r\n')
        w = int(re.search(rb'/Width\s+(\d+)', d).group(1)); h = int(re.search(rb'/Height\s+(\d+)', d).group(1))
        gray = b'DeviceGray' in d
        sm = re.search(rb'/SMask\s+(\d+)', d)
        px = None
        if b'FlateDecode' in d:
            raw = zlib.decompress(data)
            ch = 1 if gray else 3
            px = np.frombuffer(raw, np.uint8)[: w * h * ch].reshape((h, w) if ch == 1 else (h, w, ch)).astype(float)
        out[num] = dict(w=w, h=h, gray=gray, smask=int(sm.group(1)) if sm else None, px=px)
    return out


def boxes(path):
    """Caixas (pt, origem embaixo) dos objetos de imagem da 1a pagina, na ordem."""
    pdf = pdfium.PdfDocument(path)
    page = pdf[0]
    H = page.get_size()[1]
    res = []
    for o in page.get_objects():
        if o.type != c.FPDF_PAGEOBJ_IMAGE:
            continue
        L, B, R, T = (ctypes.c_float() for _ in range(4))
        c.FPDFPageObj_GetBounds(o.raw, L, B, R, T)
        md = o.get_metadata()
        res.append(dict(l=L.value, b=B.value, r=R.value, t=T.value, w=md.width, h=md.height, H=H))
    return res


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def fit(d, a):
    """Ajuste por grade de A*Phi((c-d)/s) (A = maximo)."""
    A = a.max()
    best = None
    for s in np.arange(0.05, 12, 0.02):
        for c0 in np.arange(-15, 15, 0.02):
            pred = A * np.array([phi((c0 - x) / s) for x in d]) if False else A * 0.5 * (1 + np.vectorize(math.erf)((c0 - d) / s / math.sqrt(2)))
            e = float(((pred - a) ** 2).sum())
            if best is None or e < best[0]:
                best = (e, c0, s)
    return A, best[1], best[2], best[0]


def main():
    for name in sys.argv[1:]:
        path = f'tools/image-lab/.out/{name}.pdf'
        ims = images(path)
        bx = boxes(path)
        # a camada do efeito: imagem RGB com SMask; a imagem em si: a de 480x360
        layer = next((v for v in ims.values() if not v['gray'] and v['smask']), None)
        if not layer:
            print(name, 'sem camada'); continue
        mask = ims[layer['smask']]['px']
        lb = next(b for b in bx if b['w'] == layer['w'] and b['h'] == layer['h'])
        pb = next((b for b in bx if b['w'] == 480 and b['h'] == 360), None)
        ppt = layer['w'] / (lb['r'] - lb['l'])  # px por pt
        rgb = layer['px'].reshape(-1, 3)
        col = tuple(int(v) for v in rgb[len(rgb) // 2])
        row = mask[mask.shape[0] // 2]
        xs = (np.arange(len(row)) + 0.5) / ppt + lb['l']
        ref = pb['l'] if pb else lb['l']
        d = ref - xs  # para fora da borda esquerda da imagem
        sel = (d > -20) & (d < 30)
        A, c0, s, e = fit(d[sel], row[sel] / 255)
        print(f"{name}: camada {layer['w']}x{layer['h']} px ({ppt * 72:.0f} ppp) caixa {lb['l']:.2f}..{lb['r']:.2f} imagem {ref:.2f} cor {col} | A={A:.3f} c={c0:.2f}pt s={s:.2f}pt err={e:.4f}")


if __name__ == '__main__':
    main()
