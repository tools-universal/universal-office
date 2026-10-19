"""Gera shared/ui/src/toolbar/symbols.ts a partir da fonte Material Symbols
Rounded (Apache 2.0) que o demo do Write já versiona: instância padrão
(FILL 0, GRAD 0, opsz 24, wght 400), caminhos no formato dos SVGs do Google
(viewBox "0 -960 960 960"). Uso:

  pip install fonttools brotli
  python shared/ui/tools/extract-symbols.py

A lista de nomes fica em NAMES abaixo (só os ícones que as barras usam — o
módulo é carregado sob demanda, mas cada ícone pesa ~1 KB)."""
import os, re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
FONT = os.path.join(ROOT, 'write', 'packages', 'editor', 'demo', 'fonts', 'material-symbols-rounded.woff2')
OUT = os.path.join(ROOT, 'shared', 'ui', 'src', 'toolbar', 'symbols.ts')

NAMES = sorted(set(open(os.path.join(HERE, 'symbols.txt'), encoding='utf-8').read().split()))

f = TTFont(FONT)
cmap = f.getBestCmap()
rev = {g: chr(c) for c, g in cmap.items()}
lig = {}
for look in f['GSUB'].table.LookupList.Lookup:
    for st in look.SubTable:
        st = getattr(st, 'ExtSubTable', st)
        if not hasattr(st, 'ligatures'):
            continue
        for first, ls in st.ligatures.items():
            for l in ls:
                try:
                    s = rev[first] + ''.join(rev[c] for c in l.Component)
                except KeyError:
                    continue
                lig[s] = l.LigGlyph
gs = f.getGlyphSet()

def fmt(n):
    s = ('%.1f' % n).rstrip('0').rstrip('.')
    return '0' if s == '-0' else s

out = []
missing = []
for name in NAMES:
    g = lig.get(name)
    if not g:
        missing.append(name)
        continue
    pen = SVGPathPen(gs, ntos=fmt)
    gs[g].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
    d = pen.getCommands()
    # compacta: sem espaço antes de número negativo nem depois do comando
    d = re.sub(r' (?=-)', '', d)
    d = re.sub(r'([A-Za-z]) ', r'', d)
    out.append(f"  '{name}': '{d}',")
if missing:
    print('missing:', ' '.join(missing), file=sys.stderr)
with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('// GERADO por shared/ui/tools/extract-symbols.py — não editar à mão.\n')
    fh.write('// Material Symbols Rounded (Apache 2.0, Google), instância padrão\n')
    fh.write('// (FILL 0, wght 400, opsz 24): caminhos SVG no viewBox "0 -960 960 960".\n')
    fh.write('export const SYMBOLS: Record<string, string> = {\n')
    fh.write('\n'.join(out) + '\n};\n')
print(len(out), 'icons ->', OUT)
