# Gera packages/slides-core/src/preset-defs.ts a partir do presetShapeDefinitions.xml
# (ECMA-376 Parte 1, anexo D — as ~187 geometrias preset do DrawingML) num formato
# compacto, interpretado em tempo de execução por preset-engine.ts.
#
# Formato por preset: "av|gd|paths"
#   av / gd : "nome=fórmula" separados por ';' (fórmula = tokens separados por espaço)
#   paths   : caminhos separados por '#'; cada um "w,h,fill,stroke~comandos"
#             comandos separados por ';': M x y | L x y | A wR hR st sw |
#             Q x1 y1 x y | C x1 y1 x2 y2 x y | Z
#
# Uso: python tools/gen-preset-defs.py <presetShapeDefinitions.xml>
import re, sys, os
import xml.etree.ElementTree as ET

src = sys.argv[1]
root = ET.parse(src).getroot()
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'

def gds(el):
    if el is None: return ''
    return ';'.join(f"{g.get('name')}={g.get('fmla')}" for g in el.findall(A + 'gd'))

def pt(e):
    p = e.find(A + 'pt')
    return f"{p.get('x')} {p.get('y')}"

out = {}
for shape in root:
    name = shape.tag
    av = gds(shape.find(A + 'avLst'))
    gd = gds(shape.find(A + 'gdLst'))
    paths = []
    pl = shape.find(A + 'pathLst')
    for p in (pl.findall(A + 'path') if pl is not None else []):
        attrs = ','.join([p.get('w', ''), p.get('h', ''), p.get('fill', ''), p.get('stroke', '')])
        cmds = []
        for c in p:
            t = c.tag.replace(A, '')
            if t == 'moveTo': cmds.append('M ' + pt(c))
            elif t == 'lnTo': cmds.append('L ' + pt(c))
            elif t == 'arcTo': cmds.append(f"A {c.get('wR')} {c.get('hR')} {c.get('stAng')} {c.get('swAng')}")
            elif t == 'quadBezTo':
                ps = c.findall(A + 'pt'); cmds.append('Q ' + ' '.join(f"{q.get('x')} {q.get('y')}" for q in ps))
            elif t == 'cubicBezTo':
                ps = c.findall(A + 'pt'); cmds.append('C ' + ' '.join(f"{q.get('x')} {q.get('y')}" for q in ps))
            elif t == 'close': cmds.append('Z')
        paths.append(attrs + '~' + ';'.join(cmds))
    out[name] = f"{av}|{gd}|{'#'.join(paths)}"

here = os.path.dirname(os.path.abspath(__file__))
dst = os.path.join(here, '..', 'packages', 'slides-core', 'src', 'preset-defs.ts')
with open(dst, 'w', encoding='utf8', newline='\n') as f:
    f.write('// GERADO por tools/gen-preset-defs.py a partir do presetShapeDefinitions.xml\n')
    f.write('// (ECMA-376 Parte 1) — não editar à mão. Interpretado por preset-engine.ts.\n')
    f.write('// Formato: "av|gd|paths"; paths = "w,h,fill,stroke~M x y;L x y;A wR hR st sw;Q …;C …;Z" separados por #.\n')
    f.write('export const PRESET_DEFS: Record<string, string> = {\n')
    for k in sorted(out):
        f.write(f"  {k}: {repr(out[k])},\n" if re.match(r'^[A-Za-z_]\w*$', k) else f"  '{k}': {repr(out[k])},\n")
    f.write('};\n')
print(len(out), 'presets ->', dst, os.path.getsize(dst), 'bytes')
