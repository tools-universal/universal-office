# WordNext — Arquitetura

Editor de texto com compatibilidade máxima com o Microsoft Word — tanto no formato
(.docx / OOXML) quanto na **renderização** (layout idêntico ao do Word).

Entregáveis: **webcomponent** (`<word-next>`) e **app Electron**.

## Metodologia central: o Word como oráculo

Não tentamos adivinhar o comportamento do Word lendo só a spec ECMA-376 (a spec
descreve o formato, não o comportamento de layout/edição). Em vez disso:

1. **`tools/word-lab`** dirige o Word real via automação COM.
2. Cada *experimento* aplica UMA operação (digitar, negrito, Enter, colar, etc.)
   sobre um estado conhecido e salva antes/depois.
3. O lab extrai os `.docx` (são ZIPs), normaliza o XML e gera um **diff** —
   esse diff é a especificação observada de como a operação muda a estrutura.
4. Para renderização: o Word exporta para PDF/XPS; rasterizamos e comparamos
   pixel a pixel com a saída do nosso motor de layout (teste diferencial).
5. Cada experimento vira conhecimento versionado em `tools/word-lab/results/`
   e, depois, um teste de regressão no pacote correspondente.

## Estrutura

```
packages/
  docx-core/   Modelo do documento + parse/serialize OOXML.
               REGRA DE OURO: round-trip sem perdas. Partes/atributos que não
               entendemos ainda são preservados byte a byte (rawXml passthrough).
  layout/      Motor de layout: quebra de linha, justificação, paginação,
               tabelas, floats. Replica o comportamento do Word (incl.
               compatSettings como compatibilityMode=15). Saída: árvore de
               posições absolutas (páginas → linhas → runs de glifos).
  editor/      Webcomponent <word-next>. Renderiza a árvore de layout em
               canvas (caret, seleção e IME próprios — contenteditable NÃO
               consegue reproduzir o layout do Word). Edição = operações
               sobre o modelo do docx-core, espelhando as mutações de XML
               observadas no word-lab.
apps/
  electron/    Shell desktop embarcando o webcomponent + integração de SO
               (arquivos recentes, impressão, associação .docx).
tools/
  word-lab/    Oráculo: experimentos COM + diffs + export PDF para
               comparação visual.
```

## Decisões fundamentais

- **Canvas, não DOM/contenteditable.** "Renderização igual" exige controlar
  cada quebra de linha e posição de glifo. O browser nunca quebraria linhas
  exatamente como o Word. Fazemos nosso próprio line breaker usando métricas
  de fonte reais (parse de TTF/OTF — hmtx/kern/GPOS), como o Google Docs
  pós-2021.
- **Unidades do Word internamente**: twips (1/20 pt) para layout, EMUs para
  desenho, half-points para tamanho de fonte. Conversão para px só no momento
  de pintar.
- **Modelo de dados fiel ao OOXML**, não uma abstração "bonita". A árvore
  interna espelha w:body/w:p/w:r/w:t + props. Abstrair cedo demais é o que
  quebra a compatibilidade de todos os outros editores.
- **Fidelidade > features.** Cada feature nova entra apenas com: experimento
  no word-lab + round-trip test + (quando visual) comparação com PDF do Word.

## Fases

1. **Infra do oráculo** (word-lab) + docx-core com round-trip sem perdas. ← atual
2. Layout de texto básico: parágrafos, runs, fontes, quebra de linha,
   paginação A4 — validado por pixel-diff contra PDF do Word.
3. Editor: caret/seleção/digitação/IME em canvas; mutações espelhando o lab.
4. Formatação: estilos, listas, tabelas, headers/footers, seções.
5. Objetos: imagens, shapes, campos, notas; Electron shell.
6. Avançado: track changes, comentários, equações.
