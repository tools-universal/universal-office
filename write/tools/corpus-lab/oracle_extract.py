"""Extrai linhas (pdftext) de cada PDF de uma pasta para <nome>.word.json em
outra pasta. Usado pelo oráculo de layout (tools/layout-oracle/run.mjs).

Formato: {"pages": [{"w": pt, "h": pt, "lines": [{"y","x0","x1","size","text"}]}]}
(y = baseline a partir do topo, em pontos; texto sem brancos).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdftext  # noqa: E402


def main():
    src, dst = sys.argv[1], sys.argv[2]
    vlines = '--vlines' in sys.argv[3:]
    if not os.path.isdir(src):
        return
    for f in sorted(os.listdir(src)):
        if not f.endswith('.pdf'):
            continue
        out = os.path.join(dst, f[:-4] + '.word.json')
        pdf = os.path.join(src, f)
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(pdf):
            continue
        data = pdftext.extract(pdf, objects=True, vlines=vlines)
        with open(out, 'w', encoding='utf8', newline='\n') as fh:
            json.dump(data, fh, ensure_ascii=False, indent=0)
        print('extraído', f)


if __name__ == '__main__':
    main()
