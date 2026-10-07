# Gráfico / SmartArt animados POR PARTES — o COM do PowerPoint não cria esses
# builds ("Invalid request"; o legado ChartUnitEffect só aceita gráficos
# MSGraph). Aqui a animação é escrita no XML conforme a ECMA-376
# (`<p:graphicEl><a:chart seriesIdx categoryIdx bldStep>` / `<a:dgm id>` +
# `<p:bldGraphic><p:bldSub><a:bldChart|a:bldDgm>`), sobre um deck-base gerado
# pelo PowerPoint (gráficos/SmartArt reais). O PowerPoint depois abre e regrava
# o deck (gen-graficos-partes.ps1): se o build sobrevive à regravação, o app
# aceitou — e o arquivo regravado é a referência canônica.
#
# SmartArt: `<a:dgm id>` = modelId da FORMA do desenho (`dsp:sp modelId`, ponto
# "pres"). Medido: com o id do NÓ de dados o app aceita e regrava, mas nada anima.
#
# Uso: python tools/ppt-lab/playback/gen-graficos-partes.py <base.pptx> <saida.pptx>
import re
import sys
import zipfile

src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
names = zin.namelist()

def slide_xml(n):
    return zin.read(f'ppt/slides/slide{n}.xml').decode('utf8')

def rels(n):
    return zin.read(f'ppt/slides/_rels/slide{n}.xml.rels').decode('utf8')

ids = iter(range(3, 100000))

def fx(spid, inner, node_type, delay):
    """Efeito de entrada 'revelar de baixo' (presetID 22/4) sobre um alvo gráfico.
    `delay` = início acumulado do sub-par (o cache que a interface grava p/ "após o anterior")."""
    tgt = f'<p:tgtEl><p:spTgt spid="{spid}"><p:graphicEl>{inner}</p:graphicEl></p:spTgt></p:tgtEl>'
    a, b, c = next(ids), next(ids), next(ids)
    return (f'<p:par><p:cTn id="{a}" fill="hold"><p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="{b}" presetID="22" presetClass="entr" presetSubtype="4" fill="hold" grpId="0" nodeType="{node_type}">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:set><p:cBhvr><p:cTn id="{c}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>{tgt}'
            f'<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>'
            f'<p:animEffect transition="in" filter="wipe(down)"><p:cBhvr><p:cTn id="{next(ids)}" dur="500"/>{tgt}</p:cBhvr></p:animEffect>'
            f'</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>')

def timing(spid, parts, bld_sub, together=False):
    """Um passo automático; as partes encadeiam 'após o anterior' (ou todas
    juntas, `together`)."""
    global ids
    ids = iter(range(3, 100000))
    if together:
        subs = ''.join(fx(spid, inner, 'withEffect', 0) for inner in parts)
    else:
        subs = ''.join(fx(spid, inner, 'withEffect' if i == 0 else 'afterEffect', i * 500) for i, inner in enumerate(parts))
    # cada parte num sub-par próprio (cadeia "após o anterior")
    step = (f'<p:par><p:cTn id="{next(ids)}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
            f'<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>{subs}</p:childTnLst></p:cTn></p:par>')
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            f'{step}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            f'</p:childTnLst></p:cTn></p:par></p:tnLst><p:bldLst><p:bldGraphic spid="{spid}" grpId="0"><p:bldSub>{bld_sub}</p:bldSub></p:bldGraphic></p:bldLst></p:timing>')

def chart_parts(nser, ncat, mode):
    bg = '<a:chart seriesIdx="-3" categoryIdx="-3" bldStep="gridLegend"/>'
    if mode == 'series':
        return [bg] + [f'<a:chart seriesIdx="{s}" categoryIdx="-4" bldStep="series"/>' for s in range(nser)]
    if mode == 'category':
        return [bg] + [f'<a:chart seriesIdx="-4" categoryIdx="{c}" bldStep="category"/>' for c in range(ncat)]
    if mode == 'seriesEl':
        return [bg] + [f'<a:chart seriesIdx="{s}" categoryIdx="{c}" bldStep="ptInSeries"/>' for s in range(nser) for c in range(ncat)]
    if mode == 'categoryEl':
        return [bg] + [f'<a:chart seriesIdx="{s}" categoryIdx="{c}" bldStep="ptInCategory"/>' for c in range(ncat) for s in range(nser)]
    raise ValueError(mode)

def put_timing(x, t):
    """`<p:timing>` vai depois de clrMapOvr/transition e ANTES do extLst final do slide."""
    x = re.sub(r'<p:timing>.*?</p:timing>', '', x, flags=re.S)
    tail = max(x.rfind('</p:clrMapOvr>'), x.rfind('</p:transition>'), x.rfind('</mc:AlternateContent>'))
    ext = x.find('<p:extLst>', tail)
    at = ext if ext >= 0 else x.rfind('</p:sld>')
    return x[:at] + t + x[at:]

def frame_info(n):
    x = slide_xml(n)
    m = re.search(r'<p:graphicFrame>.*?<p:cNvPr id="(\d+)".*?</p:graphicFrame>', x, re.S)
    return x, m.group(1), m.group(0)

def rel_target(n, kind):
    r = rels(n)
    m = re.search(r'Target="\.\./' + kind + r's/(\w+\.xml)"', r)
    return m.group(1) if m else None

out = {}
modes = {1: 'series', 2: 'category', 3: 'seriesEl', 4: 'categoryEl', 5: 'category', 6: 'series'}
for n, mode in modes.items():
    x, spid, _ = frame_info(n)
    chart = zin.read('ppt/charts/' + rel_target(n, 'chart')).decode('utf8')
    nser = len(re.findall(r'<c:ser>', chart))
    ncat = max(int(v) for v in re.findall(r'<c:ptCount val="(\d+)"', chart))
    t = timing(spid, chart_parts(nser, ncat, mode), f'<a:bldChart bld="{mode}"/>')
    out[f'ppt/slides/slide{n}.xml'] = put_timing(x, t)
    print(f'slide {n}: gráfico spid {spid} {mode} {nser}x{ncat}')

def drawing_shapes(n):
    """modelIds das formas do desenho do SmartArt do slide, na ordem do desenho."""
    dm = re.search(r'Target="\.\./diagrams/(data\d+\.xml)"', rels(n)).group(1)
    drels = f'ppt/diagrams/_rels/{dm}.rels'
    m = re.search(r'Target="(?:\.\./diagrams/)?(drawing\d+\.xml)"', zin.read(drels).decode('utf8')) if drels in names else None
    drawing = zin.read('ppt/diagrams/' + (m.group(1) if m else dm.replace('data', 'drawing'))).decode('utf8')
    return re.findall(r'<dsp:sp modelId="(\{[^}]+\})"', drawing)

# 7: um a um · 8: nível de uma vez (lista plana = todos juntos) · 9: um a um invertido
for n, (bld, rev, together) in {7: ('one', False, False), 8: ('lvlAtOnce', False, True), 9: ('one', True, False)}.items():
    x, spid, _ = frame_info(n)
    shapes = drawing_shapes(n)
    if rev:
        shapes = shapes[::-1]
    t = timing(spid, [f'<a:dgm id="{g}"/>' for g in shapes],
               f'<a:bldDgm bld="{bld}"' + (' rev="1"' if rev else '') + '/>', together)
    out[f'ppt/slides/slide{n}.xml'] = put_timing(x, t)
    print(f'slide {n}: SmartArt spid {spid} {bld}{" rev" if rev else ""} {len(shapes)} formas')

zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    zout.writestr(it, out.get(it.filename, zin.read(it.filename)))
zout.close()
print('ok', dst)
