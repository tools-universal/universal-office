# Le o PDF da sonda bidi (gen-bidi-probe.mjs): x (twips) do inicio de cada
# texto "rNcM" e as linhas verticais coloridas (vermelha, azul, verde) na
# altura da 1a linha da tabela.
#   python -I bidi-probe.py <pdf>
import sys
import pypdfium2 as pdfium
pdf = pdfium.PdfDocument(sys.argv[1])
page = pdf[0]
H = page.get_height()
tp = page.get_textpage()
n = tp.count_chars()
text = tp.get_text_range()
i = 0
while True:
    k = text.find('r', i)
    if k < 0 or k + 4 > len(text): break
    word = text[k:k + 4]
    if word[0] == 'r' and word[2] == 'c':
        l, b, r, t = tp.get_charbox(k)
        print('texto', word, round(l * 20), 'y', round((H - t) * 20))
    i = k + 1
S = 4
img = page.render(scale=S).to_pil().convert('RGB')
px = img.load()
W, Hp = img.size
# 1a linha de texto: procura a altura da tabela pela borda preta de cima
y = None
for yy in range(int(70 * S), int(200 * S)):
    if px[int(300 * S), yy][0] < 60 and px[int(300 * S), yy][1] < 60: y = yy + int(6 * S); break
names = {'vermelha': (255, 0, 0), 'azul': (0, 0, 255), 'verde': (0, 170, 0)}
runs = []
for x in range(W):
    p = px[x, y]
    for nm, c in names.items():
        if abs(p[0] - c[0]) < 70 and abs(p[1] - c[1]) < 70 and abs(p[2] - c[2]) < 70:
            if runs and runs[-1][0] == nm and runs[-1][2] == x - 1: runs[-1][2] = x
            else: runs.append([nm, x, x])
for nm, a, b in runs:
    print('borda', nm, round(a / S * 20), round((b + 1 - a) / S * 20))
