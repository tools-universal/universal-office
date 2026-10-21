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
| Imagens inline/flutuantes | 🟡 | oráculo `objects`/`selffloat`/`hffloat`/`hfgroup` (contorno, subir até a margem × descer o parágrafo, modo 14) + corpus | contorno "tight" pelo polígono; edição de âncora/wrap pela UI |
| Seções/colunas/orientação | 🟡 | `sections.test.ts`, catálogo | todos os tipos de section break e balanceamento contínuo |
| Cabeçalhos/rodapés/campos | 🟡 | oráculo `hf`/`hffloat`/`fields` (herança entre seções, PAGE/NUMPAGES/PAGEREF/SEQ/REF) + edição de HF pelo motor | campos complexos raros |
| Footnotes/endnotes | 🟡 | parser e catálogo | edição, numeração/reinício e layout de casos longos |
| Comentários | 🟡 | `comments-toc.test.ts` + UI lateral | replies, resolved state, datas e integração moderna do Word |
| TOC/bookmarks/hyperlinks | 🟡 | catálogo e atualização local | preservação incremental de todos os bookmarks/campos complexos |
| Equações | ❌ | apenas fallback textual | OMML 1:1, edição e layout matemático |
| Shapes/WordArt/SmartArt/gráficos | ❌ | não modelados | parser, layout, edição e round-trip |
| Track changes | 🟡 | `revisions.test.ts` (46 operações refeitas e comparadas com o XML do Word; aceitar/rejeitar = Word), oráculo `revisions` (visão final e Todas as Marcações), cores/barras medidas no PDF do Word, `Doc.Revisions` do Word lê o que gravamos | numeração de lista na marcação (número antigo tachado), revisões de propriedade de tabela/célula/seção (só preservadas), movimentação criada pela edição |
| Content controls comuns | 🟡 | leitura genérica; `w:sdt` de plugins; envoltório preservado na edição | dropdown/date/checkbox/repeating section do Word; controle com `w:dataBinding` editado não atualiza o XML ligado (o Word repõe o valor ao abrir) |
| Plugins/custom inline | ✅ | API por instância, mention, `custom-inline.test.ts`, Word real | ampliar para blocos de nível de parágrafo/tabela |
| Web Component sem backend | ✅ | `offline.html`: `fetch` bloqueado, fontes embutidas, canvas pronto | reduzir tamanho do bundle autocontido (atual: ~8,8 MB) |
| Lifecycle do Web Component | ✅ | cleanup de `resize` e timer do caret; reconexão suportada | ampliar smoke automatizado de mount/unmount |
| Exportar PDF (JS e .NET) | ✅ | mesmo motor do canvas; .NET idêntico ao JS (dumps de layout e bytes do PDF); corpus real × PDFs do Word | ver “Corpus real” |
| HTML/Markdown/ODT/XPS | 🟡 | suítes dos pacotes + fallback de plugins | matriz visual completa por formato; ODT com quadros (frames) |
| Acessibilidade | ❌ | textarea proxy básica | árvore semântica, leitura por screen reader e navegação avançada |
| Colaboração em tempo real | ❌ | fora do núcleo atual | modelo de operações/CRDT e presença |

## Corpus real (2026-10-19)

993 documentos de um sistema real (.docx/.doc/.odt — fora do repositório),
diagramados pelo motor e comparados com os PDFs gerados pelo próprio Word
(`tools/corpus-lab`). O canvas do editor, o `exportPdf` do navegador e o
port .NET dão o mesmo resultado (mesma árvore de layout).

Referências refeitas em 2026-10-19 com o Word 16.0.20430 (atualizado em
2026-10-18), uma sessão nova do Word por documento
(`tools/corpus-lab/word-pdfs.mjs`). Um documento (.doc com IRM) nem o Word
abre sem credencial: as métricas valem para os outros 992.

| Métrica | Layout antigo do canvas | 1ª versão do motor | 2026-10-11 | Motor hoje |
|---|---:|---:|---:|---:|
| mesmo nº de páginas | — | 816 / 995 | 950 / 995 | **992 / 992** |
| quebras de linha idênticas em todas as páginas | — | — | — | **989 / 992** |
| linhas idênticas (média / mediana) | ≈ 0,49 (mediana) | — | 0,973 / 1,000 | **0,999 / 1,000** |
| documentos com ≥ 99% das linhas idênticas | — | 465 | 680 | **981** |
| sobreposição de pixels com o Word (F1 média / mediana) | 0,16 / 0,14 (amostra de 40) | — / 0,833 | 0,875 / 0,988 | **0,996 / 0,999** |
| desvio vertical das linhas (mediana) | — | — | 0,08 pt | **0,06 pt** |

O número de páginas já batia em todos desde a rodada 6 de paginação (o
995/995 nas referências antigas); a medição de 2026-10-11 era anterior a ela.
A atualização do Word mudou uma regra medida: a lista com `startOverride`
que atravessa a 2ª página não recomeça mais (oráculo `numbering3`, `pg2-*`).
O oráculo inteiro foi refeito no Word novo; só essa regra mudou.

Novas regras medidas nesta rodada (oráculos `tblshd`, `brfirst`,
`tblsqueeze`): o `w:shd` da tabela (`w:tblPr`, direto, do estilo ou do
condicional) não pinta as células, só o da célula — com espaçamento entre
células, pinta o vão em volta delas; no parágrafo que começa com quebra de
coluna, a linha na coluna seguinte leva o recuo da 1ª linha e o número da
lista; tabela cujas palavras inquebráveis passam da largura disponível, com
largura pedida em pct (até 100%) ou em twips abaixo da disponível, vai à
largura disponível e é espremida como a automática (em twips ≥ disponível,
cresce).

Faixa do cabeçalho (oráculo `hfgroup`, corpus t205-ea65ae51): parágrafo com
recuos que se cruzam (direita antes da esquerda: um caractere por linha) não
tem largura própria — o vão ao lado dos flutuantes é medido na coluna inteira,
então a linha desce para baixo da faixa e o cabeçalho empurra o corpo. No modo
15, `behindDoc` só vale sem contorno: com contorno (quadrado, justo, através,
em cima e embaixo) o objeto fica na frente, na ordem do `relativeHeight`, no
corpo e no cabeçalho; nos modos ≤ 14 o `behindDoc` vale sempre. Campo PAGE em
caixa de texto dentro de grupo é recalculado em cada página e, no
cabeçalho/rodapé, não é partido por caractere numa caixa mais estreita que ele
(no corpo é). t205-ea65ae51 foi de 82 para 6 linhas diferentes (pixels 0,82 →
0,999); sobra o recuo de um item de lista na última página.

Restantes (mesmo número de páginas): recuo do item de lista na última página de
t205-ea65ae51, autoajuste de tabela com imagens
(t88-253bff00), pixels de pequenas diferenças de desenho (t44-7e4f6e89,
t70-2b7e4e40) e um rótulo partido em dois só na extração do texto
(t205-423aa591).

## Gravação sem perdas (2026-10-19)

O leitor guarda as fatias cruas de cada parágrafo, run, tabela e filho de topo
de cada parte (`readFullDocument(pkg, { sources: true })`); o modelo só leva ids
(`props.src`, `TableBlock.src`), que sobrevivem ao undo e às cópias das props.
Ao salvar, o que está igual à linha de base sai byte a byte; o que mudou aplica
só as diferenças sobre o w:rPr/w:pPr/w:sectPr original (a regra de
`directRPr`/`directPPr` do motor), reembrulha sdt/hyperlink, refaz os envoltórios de revisão pelas props e mantém
indicadores/comentários na posição relativa. Verificação:
`node tools/corpus-lab/lossless-check.mjs [--out dir]` e
`tools/corpus-lab/word-open-check.ps1 -Dir dir` (Word via COM, invisível).

## Gates de conclusão

1. Cada linha 🟡/❌ precisa de experimento Word versionado.
2. Edições devem preservar OOXML não compreendido, não apenas abrir sem erro.
3. Features visuais precisam de pixel/XPS diff em corpus pequeno e documentos reais.
4. Build TypeScript, suíte Vitest e smoke browser offline devem permanecer verdes.
