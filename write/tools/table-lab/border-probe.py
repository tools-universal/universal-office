# Le os PDFs da sonda de bordas: por tabela (na ordem dos rotulos), os
# retangulos/tracos que o Word desenhou para a borda de CIMA (horizontal).
import re, sys, zlib, os, json
STYLES = ['single','thick','double','dotted','dashed','dotDash','dotDotDash','triple','thinThickSmallGap','thickThinSmallGap',
  'thinThickThinSmallGap','thinThickMediumGap','thickThinMediumGap','thinThickThinMediumGap','thinThickLargeGap','thickThinLargeGap',
  'thinThickThinLargeGap','wave','doubleWave','dashSmallGap','dashDotStroked','threeDEmboss','threeDEngrave','outset','inset']
tok = re.compile(rb'\((?:\.|[^\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|/[^\s/\[\]()<>]+|[-+]?\d*\.\d+|[-+]?\d+|[A-Za-z*\'"]+')
def streams(b):
    for m in re.finditer(rb'stream\r?\n(.*?)endstream', b, re.S):
        try: yield zlib.decompress(m.group(1))
        except Exception: pass
def parse(s):
    st=[]; segs=[[]]; inbt=False; lw=1; col='000000'; fcol='000000'; path=[]
    for t in tok.findall(s):
        if inbt:
            if t==b'ET': inbt=False; segs.append([])
            continue
        if t==b'BT': inbt=True; continue
        if re.fullmatch(rb'[-+]?\d*\.?\d+', t): st.append(float(t)); continue
        op=t.decode('latin1')
        try:
          pass
        except Exception: pass
        need={'w':1,'rg':3,'RG':3,'g':1,'G':1,'re':4,'m':2,'l':2,'c':6}.get(op,0)
        if len(st)<need: st=[]; continue
        if op=='w': lw=st[-1]
        elif op=='rg': fcol='%02X%02X%02X'%tuple(round(x*255) for x in st[-3:])
        elif op=='RG': col='%02X%02X%02X'%tuple(round(x*255) for x in st[-3:])
        elif op=='g': fcol='%02X'%round(st[-1]*255)*3
        elif op=='G': col='%02X'%round(st[-1]*255)*3
        elif op=='re': path.append(('re',st[-4:]))
        elif op in ('m','l'): path.append((op,st[-2:]))
        elif op=='c': path.append(('c',st[-6:]))
        elif op in ('f','f*','F'):
            segs[-1].append({'fill':fcol,'path':path}); path=[]
        elif op in ('S','s'):
            segs[-1].append({'stroke':col,'w':lw,'path':path}); path=[]
        elif op=='n': path=[]
        st=[]
    return [s for s in segs]
d=sys.argv[1]
for f in sorted(os.listdir(d)):
    b=open(os.path.join(d,f),'rb').read()
    items=[]
    for st in streams(b):
        if b' re' not in st and b' l' not in st: continue
        try:
            for seg in parse(st): items+=seg
        except Exception as e: print('erro',e)
    # clusters por tabela (y), na ordem de cima para baixo
    desc=[]
    for it in items:
        for op,a in it['path']:
            if op=='re': desc.append(('R',a[0],a[1],a[2],a[3],it.get('fill')))
            else: desc.append((op,a,it.get('stroke'),it.get('w')))
    # agrupa por faixas de 40 pt
    groups=[]
    for x in desc:
        y = x[2] if x[0]=='R' else (x[1][1] if len(x[1])>1 else 0)
        for g in groups:
            if abs(g['y']-y) < 40: g['items'].append(x); break
        else: groups.append({'y':y,'items':[x]})
    groups.sort(key=lambda g:-g['y'])
    out=[]
    for g in groups[:3]:
        R=[x for x in g['items'] if x[0]=='R']
        top=max([x[2]+x[4] for x in R] or [max(x[1][1] for x in g['items'])])
        left=min([x[1] for x in R] or [0])
        hr=sorted(set((round(x[2]+x[4]-top,2),round(x[4],2),x[5]) for x in R if x[3]>x[4] and top-(x[2]+x[4])<12))
        L=[x for x in g['items'] if x[0]!='R']
        ln=[(x[0],[round(v-(left if k%2==0 else top),2) for k,v in enumerate(x[1])],x[2],round(x[3],2)) for x in L][:6]
        out.append((hr, len(L), ln))
    print('==', f[:-4])
    for sz,(hr,nl,ln) in zip([4,12,24],out): print('  sz',sz,'rects(top-off, h, cor):',hr,'| linhas:',nl, ln[:3])
