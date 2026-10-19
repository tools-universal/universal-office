# Matriz Word ↔ Write

Estado auditado em 2026-07-11; layout/PDF reauditados em 2026-10-11 (motor
`docx-layout`, ver “Corpus real” abaixo). “Completo” exige evidência em `.docx` e, quando
visual, comparação com Word/PDF/XPS. Esta matriz é o backlog autoritativo; a
paridade total ainda não está concluída.

| Área | Estado | Evidência atual | Gap restante |
|---|---:|---|---|
| Abrir/salvar DOCX | ✅ | gravação sem perdas (`source.ts`/`lossless.ts`, `lossless.test.ts`); corpus real: 867/868 salvam sem editar byte a byte e, editados, sem perder hyperlinks/indicadores/campos/notas/sdt/equações/desenhos; Word abre os 777 editados sem reparo | tabela editada perde marcadores no nível de linha/célula; campo que atravessa parágrafos (sumário) editado à mão volta ao cru |
| Abrir .doc (binário) | 🟡 | `docx-core/src/doc` (convertDocToDocx) + testes .NET DocBinary; corpus real | salvar continua em .docx; recursos raros do formato binário |
| Texto, Enter, Backspace | ✅ | word-lab 001/003/009 + `editing.test.ts` | — |
| Undo/redo | 🟡 | implementação no editor | faltam testes de integração para tabelas, notas e inlines customizados |
| Clipboard/IME | 🟡 | implementação no preview | clipboard rico só é interno; HTML/RTF do sistema ainda não é preservado |
| Fonte/tamanho/negrito/itálico/cor | ✅ | word-lab 002/005/008/010 | — |
| Sublinhados/tachados | 🟡 | `underline-strike.test.ts` | UI não expõe toda a galeria do Word |
| OpenType/kerning/quebra de linha | ✅ | `linebreak-oracle.test.ts`, XPS e tabelas empíricas | cobertura limitada a Aptos/Calibri |
| Paginação e quebras | 🟡 | oráculo `pagination`/`pagefit`/`breaks`/`keeptbl`/`sectfit` + corpus real | quebras de linha de tabela em casos raros; documentos com campos que mudam de tamanho |
| Parágrafos/alinhamento/recuos/espaçamento | 🟡 | word-lab 006 + testes | faltam tabs/indents/listas em todos os estilos localizados |
| Estilos | 🟡 | styles.xml real + `styles-pagebreak-hf.test.ts` | criação/edição completa da galeria de estilos |
| Listas | 🟡 | word-lab 007 + numbering.xml | formatos multinível/arbitrários e reinício de numeração |
| Tabelas | 🟡 | oráculo `tables`/`keeptbl`/`ftable` (bandas de borda, células verticais, tabelas flutuantes divididas entre páginas) + `table-serialize.test.ts` | edição estrutural; autofit de conteúdo em casos extremos |
| Imagens inline/flutuantes | 🟡 | oráculo `objects`/`selffloat`/`hffloat` (contorno, subir até a margem × descer o parágrafo, modo 14) + corpus | contorno "tight" pelo polígono; edição de âncora/wrap pela UI |
| Seções/colunas/orientação | 🟡 | `sections.test.ts`, catálogo | todos os tipos de section break e balanceamento contínuo |
| Cabeçalhos/rodapés/campos | 🟡 | oráculo `hf`/`hffloat`/`fields` (herança entre seções, PAGE/NUMPAGES/PAGEREF/SEQ/REF) + edição de HF pelo motor | campos complexos raros |
| Footnotes/endnotes | 🟡 | parser e catálogo | edição, numeração/reinício e layout de casos longos |
| Comentários | 🟡 | `comments-toc.test.ts` + UI lateral | replies, resolved state, datas e integração moderna do Word |
| TOC/bookmarks/hyperlinks | 🟡 | catálogo e atualização local | preservação incremental de todos os bookmarks/campos complexos |
| Equações | ❌ | apenas fallback textual | OMML 1:1, edição e layout matemático |
| Shapes/WordArt/SmartArt/gráficos | ❌ | não modelados | parser, layout, edição e round-trip |
| Track changes | ❌ | não modelado | `w:ins`, `w:del`, propriedades e UI de revisão |
| Content controls comuns | 🟡 | leitura genérica; `w:sdt` de plugins; envoltório preservado na edição | dropdown/date/checkbox/repeating section do Word; controle com `w:dataBinding` editado não atualiza o XML ligado (o Word repõe o valor ao abrir) |
| Plugins/custom inline | ✅ | API por instância, mention, `custom-inline.test.ts`, Word real | ampliar para blocos de nível de parágrafo/tabela |
| Web Component sem backend | ✅ | `offline.html`: `fetch` bloqueado, fontes embutidas, canvas pronto | reduzir tamanho do bundle autocontido (atual: ~8,8 MB) |
| Lifecycle do Web Component | ✅ | cleanup de `resize` e timer do caret; reconexão suportada | ampliar smoke automatizado de mount/unmount |
| Exportar PDF (JS e .NET) | ✅ | mesmo motor do canvas; .NET idêntico ao JS (dumps de layout e bytes do PDF); corpus real × PDFs do Word | ver “Corpus real” |
| HTML/Markdown/ODT/XPS | 🟡 | suítes dos pacotes + fallback de plugins | matriz visual completa por formato; ODT com quadros (frames) |
| Acessibilidade | ❌ | textarea proxy básica | árvore semântica, leitura por screen reader e navegação avançada |
| Colaboração em tempo real | ❌ | fora do núcleo atual | modelo de operações/CRDT e presença |

## Corpus real (2026-10-11)

995 documentos de um sistema real (.docx/.doc/.odt — fora do repositório),
diagramados pelo motor e comparados com os PDFs gerados pelo próprio Word
(`tools/corpus-lab`). O canvas do editor, o `exportPdf` do navegador e o
port .NET dão o mesmo resultado (mesma árvore de layout).

| Métrica | Layout antigo do canvas | 1ª versão do motor | Motor hoje |
|---|---:|---:|---:|
| mesmo nº de páginas | — | 816 / 995 | **950 / 995** |
| linhas idênticas (média / mediana) | ≈ 0,49 (mediana) | — | **0,973 / 1,000** |
| documentos com ≥ 99% das linhas idênticas | — | 465 | **680** |
| sobreposição de pixels com o Word (F1 média / mediana) | 0,16 / 0,14 (amostra de 40) | — / 0,833 | **0,875 / 0,988** |
| desvio vertical das linhas (mediana) | — | — | **0,08 pt** |

Gaps conhecidos do corpus: documentos em modo de compatibilidade 11 com
`useFELayout` (largura de linha menor no Word), quadros de ODT, cor de fundo
da página (`w:background`) e alguns objetos ancorados em posições
fracionárias.

## Gravação sem perdas (2026-10-19)

O leitor guarda as fatias cruas de cada parágrafo, run, tabela e filho de topo
de cada parte (`readFullDocument(pkg, { sources: true })`); o modelo só leva ids
(`props.src`, `TableBlock.src`), que sobrevivem ao undo e às cópias das props.
Ao salvar, o que está igual à linha de base sai byte a byte; o que mudou aplica
só as diferenças sobre o w:rPr/w:pPr/w:sectPr original (a regra de
`directRPr`/`directPPr` do motor), reembrulha sdt/hyperlink/revisões e mantém
indicadores/comentários na posição relativa. Verificação:
`node tools/corpus-lab/lossless-check.mjs [--out dir]` e
`tools/corpus-lab/word-open-check.ps1 -Dir dir` (Word via COM, invisível).

## Gates de conclusão

1. Cada linha 🟡/❌ precisa de experimento Word versionado.
2. Edições devem preservar OOXML não compreendido, não apenas abrir sem erro.
3. Features visuais precisam de pixel/XPS diff em corpus pequeno e documentos reais.
4. Build TypeScript, suíte Vitest e smoke browser offline devem permanecer verdes.
