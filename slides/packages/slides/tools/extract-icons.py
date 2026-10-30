"""Gera slides/packages/slides/src/chrome-icons.ts: os Material Symbols que só
as barras do <universal-slides> usam (os comuns vêm de shared/ui, symbols.ts),
como SVG cru no viewBox "0 -960 960 960" — o formato que os comandos aceitam
no lugar do nome. Mesma fonte e instância do extract-symbols.py de shared/ui
(Material Symbols Rounded, Apache 2.0; FILL 0, wght 400, opsz 24). Uso:

  pip install fonttools brotli
  python slides/packages/slides/tools/extract-icons.py
"""
import os, re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
FONT = os.path.join(ROOT, 'write', 'packages', 'editor', 'demo', 'fonts', 'material-symbols-rounded.woff2')
OUT = os.path.join(HERE, '..', 'src', 'chrome-icons.ts')

NAMES = sorted(set('''
add_photo_alternate add_to_photos ads_click animation arrow_downward arrow_upward auto_awesome_motion block
chrome_reader_mode dashboard keyboard_double_arrow_down keyboard_double_arrow_up library_add play_arrow
present_to_all preview slideshow speaker_notes timer transition_fade view_carousel wallpaper zoom_out_map
'''.split()))

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
    d = re.sub(r' (?=-)', '', d)
    d = re.sub(r'([A-Za-z]) ', r'\1', d)
    # contornos degenerados (um ponto só) que a instância padrão deixa: não desenham nada
    d = re.sub(r'M(-?[\d.]+)(-?[\d.]+)(?:[QL]\1 ?\2(?: \1 ?\2)?)+Z', '', d)
    out.append(f"  '{name}': '<path d=\"{d}\"/>',")
if missing:
    print('missing:', ' '.join(missing), file=sys.stderr)
with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('// GERADO por slides/packages/slides/tools/extract-icons.py — não editar à mão.\n')
    fh.write('// Material Symbols Rounded (Apache 2.0, Google), instância padrão (FILL 0, wght 400,\n')
    fh.write('// opsz 24), SVG cru no viewBox "0 -960 960 960": só os ícones das barras do Slides\n')
    fh.write('// que o conjunto comum (shared/ui, symbols.ts) não tem.\n')
    fh.write('export const ICONS: Record<string, string> = {\n')
    fh.write('\n'.join(out) + '\n};\n')
print(len(out), 'icons ->', OUT)
