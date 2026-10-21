# Le o PDF da sonda de sombreamento (gen-shading-probe.mjs): rasteriza cada
# pagina e, por celula, mede a cor media, a variancia (padrao listrado ou
# liso) e o periodo das listras; diz tambem se o Word usou /Pattern ou imagem.
#   python -I shading-probe.py <pdf>
import sys, re, zlib, json
import pypdfium2 as pdfium

PATTERNS = ['clear', 'solid', 'horzStripe', 'vertStripe', 'reverseDiagStripe', 'diagStripe', 'horzCross', 'diagCross',
  'thinHorzStripe', 'thinVertStripe', 'thinReverseDiagStripe', 'thinDiagStripe', 'thinHorzCross', 'thinDiagCross',
  'pct5', 'pct10', 'pct12', 'pct15', 'pct20', 'pct25', 'pct30', 'pct35', 'pct37', 'pct40', 'pct45', 'pct50',
  'pct55', 'pct60', 'pct62', 'pct65', 'pct70', 'pct75', 'pct80', 'pct85', 'pct87', 'pct90', 'pct95']
pdf_path = sys.argv[1]
raw = open(pdf_path, 'rb').read()
print('Pattern no PDF:', b'/Pattern' in raw, '| imagens:', raw.count(b'/Subtype/Image') + raw.count(b'/Subtype /Image'))
DPI = 288
pdf = pdfium.PdfDocument(pdf_path)
scale = DPI / 72
# geometria: margem esq 1701 tw, topo 1417 tw; colunas 2000 tw; linhas 400 tw exatas
TW = DPI / 1440
out = {}
row = 0
for pi in range(len(pdf)):
    page = pdf[pi]
    img = page.render(scale=scale).to_pil().convert('RGB')
    W, H = img.size
    px = img.load()
    y0 = 1417
    while row < len(PATTERNS) and (y0 + 400) * TW < H - 1417 * TW + 10:
        name = PATTERNS[row]
        cells = []
        for c in range(2):
            x0 = 1701 + c * 2000
            # miolo da celula (longe das bordas)
            xs = range(int((x0 + 60) * TW), int((x0 + 1940) * TW))
            ys = range(int((y0 + 40) * TW), int((y0 + 360) * TW))
            s = [0, 0, 0]; n = 0; vals = []
            for y in ys:
                for x in xs:
                    p = px[x, y]
                    s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n += 1
            avg = tuple(round(v / n) for v in s)
            # linha e coluna centrais: periodo das transicoes
            midy = ys[len(ys) // 2]; midx = xs[len(xs) // 2]
            rowpx = [px[x, midy] for x in xs]
            colpx = [px[midx, y] for y in ys]
            def trans(seq):
                t = [i for i in range(1, len(seq)) if seq[i] != seq[i - 1]]
                return len(t), (t[1] - t[0]) if len(t) > 1 else None
            colors = {}
            for y in ys[::3]:
                for x in xs[::3]:
                    colors[px[x, y]] = colors.get(px[x, y], 0) + 1
            top = sorted(colors.items(), key=lambda kv: -kv[1])[:3]
            cells.append({'avg': '%02X%02X%02X' % avg, 'hTrans': trans(rowpx), 'vTrans': trans(colpx),
                          'top': ['%02X%02X%02X:%d' % (k[0], k[1], k[2], v) for k, v in top]})
        out[name] = cells
        row += 1
        y0 += 400
print(json.dumps(out, indent=1))
