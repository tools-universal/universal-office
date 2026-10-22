"""Lê o plano de fundo que o Word grava no PDF: o padrão (/Pattern) da 1ª
página — sombreamento (tipo, Coords, Extend) com a função amostrada (período,
1º ciclo em resumo) ou ladrilho de imagem (BBox, Matrix, XStep/YStep).

  python write/tools/page-lab/pdf-shading.py <pdf>...
"""
import re
import sys
import zlib


def objects(data):
    return {int(n): b for n, b in re.findall(rb'(\d+) 0 obj(.*?)endobj', data, re.S)}


def stream(body):
    s = body.split(b'stream', 1)[1].lstrip(b'\r\n')
    s = s.rsplit(b'endstream', 1)[0]
    try:
        return zlib.decompress(s)
    except Exception:
        return s


for path in sys.argv[1:]:
    data = open(path, 'rb').read()
    objs = objects(data)
    print('##', path.replace('\\', '/').split('/')[-1])
    for n, b in sorted(objs.items()):
        head = b.split(b'stream')[0]
        if b'/PatternType' not in head:
            continue
        h = re.sub(rb'\s+', b' ', head).decode('latin1')
        print('  pattern', n, h[:260])
        fm = re.search(r'/Function (\d+) 0 R', h)
        if fm:
            fb = objs[int(fm.group(1))]
            fh = re.sub(rb'\s+', b' ', fb.split(b'stream')[0]).decode('latin1')
            d = stream(fb)
            size = int(re.search(r'/Size\[ ?(\d+)', fh).group(1))
            ch = len(d) // size
            v = [tuple(d[ch * i:ch * i + ch]) for i in range(size)]
            per = None
            for p in range(2, size // 2 + 1):
                if all(v[i] == v[i + p] for i in range(0, size - p, 7)):
                    per = p
                    break
            print(f'   function size={size} ch={ch} period={per} cycles={size / per if per else 1:.2f}')
            seg = v[:per or size]
            step = max(1, len(seg) // 24)
            print('   ', ' '.join(''.join(f'{c:02X}' for c in s) for s in seg[::step]))
        m = re.search(r'/Matrix\[([^\]]*)\]', h)
        if m:
            print('   matrix', m.group(1).strip())
