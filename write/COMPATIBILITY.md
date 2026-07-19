# Matriz Word ↔ Write

Estado auditado em 2026-07-11. “Completo” exige evidência em `.docx` e, quando
visual, comparação com Word/PDF/XPS. Esta matriz é o backlog autoritativo; a
paridade total ainda não está concluída.

| Área | Estado | Evidência atual | Gap restante |
|---|---:|---|---|
| Abrir/salvar DOCX | 🟡 | `roundtrip.test.ts`, catálogo real | `document.xml` ainda é regenerado; elementos OOXML desconhecidos podem ser perdidos após edição |
| Texto, Enter, Backspace | ✅ | word-lab 001/003/009 + `editing.test.ts` | — |
| Undo/redo | 🟡 | implementação no editor | faltam testes de integração para tabelas, notas e inlines customizados |
| Clipboard/IME | 🟡 | implementação no preview | clipboard rico só é interno; HTML/RTF do sistema ainda não é preservado |
| Fonte/tamanho/negrito/itálico/cor | ✅ | word-lab 002/005/008/010 | — |
| Sublinhados/tachados | 🟡 | `underline-strike.test.ts` | UI não expõe toda a galeria do Word |
| OpenType/kerning/quebra de linha | ✅ | `linebreak-oracle.test.ts`, XPS e tabelas empíricas | cobertura limitada a Aptos/Calibri |
| Paginação e quebras | 🟡 | `pagebreak.test.ts`, catálogo 10 páginas | widow/orphan e keep-with-next precisam de corpus maior |
| Parágrafos/alinhamento/recuos/espaçamento | 🟡 | word-lab 006 + testes | faltam tabs/indents/listas em todos os estilos localizados |
| Estilos | 🟡 | styles.xml real + `styles-pagebreak-hf.test.ts` | criação/edição completa da galeria de estilos |
| Listas | 🟡 | word-lab 007 + numbering.xml | formatos multinível/arbitrários e reinício de numeração |
| Tabelas | 🟡 | catálogo + `table-serialize.test.ts` | edição estrutural, autofit, repetição de cabeçalho e casos avançados |
| Imagens inline/flutuantes | 🟡 | `image.test.ts`, catálogo | edição de âncora/wrap, crop, rotação e efeitos |
| Seções/colunas/orientação | 🟡 | `sections.test.ts`, catálogo | todos os tipos de section break e balanceamento contínuo |
| Cabeçalhos/rodapés/campos | 🟡 | testes HF/campos + preview | first/even/link-to-previous e campos complexos completos |
| Footnotes/endnotes | 🟡 | parser e catálogo | edição, numeração/reinício e layout de casos longos |
| Comentários | 🟡 | `comments-toc.test.ts` + UI lateral | replies, resolved state, datas e integração moderna do Word |
| TOC/bookmarks/hyperlinks | 🟡 | catálogo e atualização local | preservação incremental de todos os bookmarks/campos complexos |
| Equações | ❌ | apenas fallback textual | OMML 1:1, edição e layout matemático |
| Shapes/WordArt/SmartArt/gráficos | ❌ | não modelados | parser, layout, edição e round-trip |
| Track changes | ❌ | não modelado | `w:ins`, `w:del`, propriedades e UI de revisão |
| Content controls comuns | 🟡 | leitura genérica; `w:sdt` de plugins | dropdown/date/checkbox/repeating section do Word |
| Plugins/custom inline | ✅ | API por instância, mention, `custom-inline.test.ts`, Word real | ampliar para blocos de nível de parágrafo/tabela |
| Web Component sem backend | ✅ | `offline.html`: `fetch` bloqueado, fontes embutidas, canvas pronto | reduzir tamanho do bundle autocontido (atual: ~8,8 MB) |
| Lifecycle do Web Component | ✅ | cleanup de `resize` e timer do caret; reconexão suportada | ampliar smoke automatizado de mount/unmount |
| HTML/Markdown/ODT/PDF/XPS | 🟡 | suítes dos pacotes + fallback de plugins | matriz visual completa por formato |
| Acessibilidade | ❌ | textarea proxy básica | árvore semântica, leitura por screen reader e navegação avançada |
| Colaboração em tempo real | ❌ | fora do núcleo atual | modelo de operações/CRDT e presença |

## Gates de conclusão

1. Cada linha 🟡/❌ precisa de experimento Word versionado.
2. Edições devem preservar OOXML não compreendido, não apenas abrir sem erro.
3. Features visuais precisam de pixel/XPS diff em corpus pequeno e documentos reais.
4. Build TypeScript, suíte Vitest e smoke browser offline devem permanecer verdes.
