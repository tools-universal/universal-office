# Write — Arquitetura

Editor de texto com compatibilidade máxima com o app de referência — tanto no formato
(.docx / OOXML) quanto na **renderização** (layout idêntico ao do app de referência).

Entregáveis: **webcomponent** (`<universal-write>`) e **app Electron** (o app
desktop Universal Write (Beta)). No npm: `@universal-office/write` (editor, com
a entrada `./viewer` que só registra o `<universal-document-viewer>`),
`@universal-office/document-viewer` (só o viewer) e `@universal-office/compare`
— ver `docs/publishing.md`. No NuGet, o motor de layout e a edição de .docx
saem no `UniversalOffice.Docx` (`dotnet/`).

## Metodologia central: o app de referência como oráculo

Não tentamos adivinhar o comportamento do app de referência lendo só a spec ECMA-376 (a spec
descreve o formato, não o comportamento de layout/edição). Em vez disso:

1. **`tools/word-lab`** dirige o app de referência via automação COM.
2. Cada *experimento* aplica UMA operação (digitar, negrito, Enter, colar, etc.)
   sobre um estado conhecido e salva antes/depois.
3. O lab extrai os `.docx` (são ZIPs), normaliza o XML e gera um **diff** —
   esse diff é a especificação observada de como a operação muda a estrutura.
4. Para renderização: o app de referência exporta para PDF/XPS; rasterizamos e comparamos
   pixel a pixel com a saída do nosso motor de layout (teste diferencial).
5. Cada experimento vira conhecimento versionado em `tools/word-lab/results/`
   e, depois, um teste de regressão no pacote correspondente.

## Estrutura

```
packages/
  docx-core/   Modelo do documento + parse/serialize OOXML.
               REGRA DE OURO: round-trip sem perdas. Partes/atributos que não
               entendemos ainda são preservados byte a byte (rawXml passthrough).
               Também lê .doc binário (`docx-core/src/doc`: convertDocToDocx) —
               o .doc vira um .docx em memória e segue o mesmo caminho.
  docx-layout/ MOTOR DE LAYOUT (sem DOM): cascata OOXML completa, quebra de
               linha, paginação (viúvas/órfãs, manter com o próximo), tabelas
               (bandas de borda, células verticais, linhas divididas), seções
               e colunas, cabeçalhos/rodapés, notas, campos (PAGE/NUMPAGES/
               SECTIONPAGES/PAGEREF/SEQ/REF e fórmulas `=` sobre eles), links
               e marcadores do PDF, objetos flutuantes com contorno, tabelas
               flutuantes e EMF. Saída: árvore de páginas → itens de pintura
               (glifos, retângulos, imagens, transformações) + linhas com
               offsets por caractere (cursor/seleção) + objetos posicionados.
               A MESMA árvore alimenta o canvas do editor, o exportPdf e o port
               .NET (`dotnet/src/UniversalOffice.Docx/DocxLayout`, paridade testada).
               Cada regra do Word é MEDIDA no oráculo sintético
               (`tools/layout-oracle`) e vira caso em `test/oracle/<grupo>`.
               Ver packages/docx-layout/README.md.
               Inclui `src/typography` (base tipográfica: parse de TTF/OTF/TTC
               — cmap, hmtx, kern, GPOS —, métricas, hifenização e o layout
               ANTIGO do canvas, layout="legacy") e `src/pdf-writer` (gerador
               de PDF: writer, subset TrueType, Type0/Identity-H).
               docx-core também traz as conversões sem DOM: `src/export`
               (HTML/Markdown) e `src/odf` (ler/gravar .odt).
  viewer/      Webcomponent <universal-document-viewer> (só leitura), mesmo
               motor e mesmo `paintItems` do editor.
  editor/      Webcomponent <universal-write>. Pinta a árvore do docx-layout em
               canvas (caret, seleção e IME próprios — contenteditable NÃO
               consegue reproduzir o layout do app de referência); edição de
               cabeçalho/rodapé e arrasto de objetos usam as linhas/objetos do
               motor. Edição = operações sobre o modelo do docx-core, espelhando
               as mutações de XML observadas no word-lab. O exportPdf usa o
               mesmo motor (fallback: PDF pelo canvas).
  compare/     Diff de documentos + webcomponent <universal-write-diff>. Motor Myers/
               histogram PORTADO do OpenCompare (tokens opacos; correções
               sincronizam nos dois sentidos). Tokeniza blocos do docx-core:
               imagem participa da igualdade POR BYTE (hash na chave + memcmp);
               conteúdo igual com formatação diferente vira change 'minor'
               (formatOnly) sem quebrar alinhamento. O <universal-write-diff> exibe em
               DOM (texto selecionável — decisão herdada do viewer do
               OpenCompare), side-by-side em grade única, com refinamento
               intra-parágrafo por palavra e diff aninhado de linhas de tabela.
apps/
  electron/    Shell desktop embarcando o webcomponent + integração de SO
               (arquivos recentes, impressão, associação .docx). Inclui
               "Comparar com…" (doc atual × .docx escolhido) exibido no
               <universal-write-diff>.
tools/
  word-lab/    Oráculo: experimentos COM + diffs + export PDF para
               comparação visual.
  layout-oracle/ Oráculo de LAYOUT: casos .docx sintéticos → Word (COM
               invisível) → PDF → linhas medidas (<caso>.word.json, versionado;
               os PDFs do Word ficam fora do git — embutem fontes da Microsoft).
  corpus-lab/  Validação contra documentos reais (fora do repositório):
               run-engine.mjs (motor → PDF), compare.py (linhas/páginas/pixels
               contra o PDF do Word), sbs.py (lado a lado). Nada do corpus
               entra no git.
```

## Decisões fundamentais

- **Canvas, não DOM/contenteditable.** "Renderização igual" exige controlar
  cada quebra de linha e posição de glifo. O browser nunca quebraria linhas
  exatamente como o app de referência. Fazemos nosso próprio line breaker usando métricas
  de fonte reais (parse de TTF/OTF — hmtx/kern/GPOS), como o Google Docs
  pós-2021.
- **Unidades do app de referência internamente**: twips (1/20 pt) para layout, EMUs para
  desenho, half-points para tamanho de fonte. Conversão para px só no momento
  de pintar.
- **Modelo de dados fiel ao OOXML**, não uma abstração "bonita". A árvore
  interna espelha w:body/w:p/w:r/w:t + props. Abstrair cedo demais é o que
  quebra a compatibilidade de todos os outros editores.
- **Fidelidade > features.** Cada feature nova entra apenas com: experimento
  no word-lab + round-trip test + (quando visual) comparação com PDF do app de referência.

## Fases

1. **Infra do oráculo** (word-lab) + docx-core — implementada; preservação
   incremental de OOXML desconhecido após edição ainda é gap crítico.
2. **Layout base** — motor `docx-layout` (canvas + PDF + .NET) validado regra a
   regra no oráculo e contra ~1000 documentos reais com os PDFs do Word
   (resultados em `COMPATIBILITY.md`).
3. **Editor** — caret, seleção, IME, clipboard, undo/redo e Web Component em uso.
4. **Formatação/documento** — estilos, listas, tabelas, HF e seções parciais.
5. **Objetos/formatos** — imagens, campos, notas, ODT/PDF/XPS/HTML/Markdown parciais.
6. **Avançado** — plugins inline e controle de alterações implementados (revisões
   no modelo, edição controlada e aceitar/rejeitar medidos no Word); shapes e equações
   permanecem no backlog.

Consulte `COMPATIBILITY.md` para a matriz auditada e `PLUGINS.md` para plugins e
inicialização sem backend.
