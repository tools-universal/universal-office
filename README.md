# UniversalOffice

Suíte de escritório com compatibilidade de formato e renderização fiel ao
Office: editor de texto (Write, .docx), planilha (Sheet, .xlsx) e apresentação
(Slides, .pptx). Cada editor existe como **web component**, como **app
desktop** e, para servidor, como **biblioteca .NET**. Licença MIT (`LICENSE`).
A pasta do repositório ainda se chama `OfficeNext`, nome antigo do projeto.

## Apps desktop (Beta)

Os três editores também saem como app desktop para Windows (instalador),
macOS (dmg, Apple Silicon e Intel) e Linux (AppImage, deb, rpm, tar.gz e
Snap; Flathub planejado). Os apps funcionam offline: as fontes abertas vão
junto, as do sistema (como a Calibri) são lidas da máquina e nunca
distribuídas, e o tema segue o claro/escuro do sistema. Os builds ainda não
são assinados, então o SmartScreen e o Gatekeeper avisam na instalação.

| App | Abre | Download |
| --- | --- | --- |
| **Universal Write (Beta)** 0.9.1 | .docx, .doc, .odt; corretor pt-BR e en-US embutido | [Windows](https://github.com/tools-universal/universal-office-desktop/releases/download/write-v0.9.1/Universal-Write-0.9.1-beta-Setup.exe) · [todos os formatos](https://github.com/tools-universal/universal-office-desktop/releases/tag/write-v0.9.1) |
| **Universal Sheet (Beta)** 0.0.1 | .xlsx, .xlsm, .xls; exporta PDF, ODS, CSV, TSV, HTML, Markdown e XML 2003 | [Windows](https://github.com/tools-universal/universal-office-desktop/releases/download/sheet-v0.0.1/Universal-Sheet-0.0.1-beta-Setup.exe) · [todos os formatos](https://github.com/tools-universal/universal-office-desktop/releases/tag/sheet-v0.0.1) |
| **Universal Slides (Beta)** 0.0.1 | .pptx, .ppt; apresentação com animações | [Windows](https://github.com/tools-universal/universal-office-desktop/releases/download/slides-v0.0.1/Universal-Slides-0.0.1-beta-Setup.exe) · [todos os formatos](https://github.com/tools-universal/universal-office-desktop/releases/tag/slides-v0.0.1) |

![Snap Store: coming soon](https://img.shields.io/badge/Snap%20Store-coming%20soon-lightgrey)
![Flathub: coming soon](https://img.shields.io/badge/Flathub-coming%20soon-lightgrey)

- **Lojas Linux:** Snap Store (`universal-write`, `universal-sheet`,
  `universal-slides`, canal beta), Flathub
  (`io.github.tools_universal.UniversalWrite`, `.UniversalSheet`,
  `.UniversalSlides`) e AppImageHub. A publicação nas lojas ainda é manual.
- **Releases:** saem das tags `<app>-v<versão>` pelo workflow "Release desktop"
  (`.github/workflows/release-desktop.yml`) para
  `tools-universal/universal-office-desktop`, como pré-lançamento. Passo a
  passo e configuração das lojas em `write/apps/electron/RELEASING.md`.
- No site, os links de download ficam num lugar só: `site/assets/downloads.js`.

## Web components (npm)

| Pacote | Componente | Versão |
|---|---|---|
| `@universal-office/write` | `<universal-write>` (editor .docx; entrada `./viewer` só com o viewer) | 0.9.1 |
| `@universal-office/document-viewer` | `<universal-document-viewer>` (só leitura, .docx/.doc) | 0.9.1 |
| `@universal-office/compare` | `<universal-write-diff>` + motor de diff de .docx | 0.0.1 |
| `@universal-office/presentation-viewer` | `<universal-presentation-viewer>` (.pptx/.ppt) | 0.0.1 |
| `@universal-office/sheet` | `<universal-sheet>` (editor .xlsx) | 0.0.1, ainda não publicado |
| `@universal-office/slides` | `<universal-slides>` (editor .pptx) | 0.0.1, ainda não publicado |
| `@universal-office/font-files` | fontes abertas métrico-compatíveis (OFL-1.1 e Apache-2.0) | 0.9.1 |
| `@universal-office/spellcheck`, `@universal-office/dictionary-pt-br`, `@universal-office/dictionary-en-us` | revisão ortográfica opcional do write (Hunspell em WASM e dicionários) | 0.9.1 |

A documentação de cada produto é o README do pacote (em inglês, vai no npm) e
o site (`site/`, páginas geradas por `npm run docs:site`).

## Biblioteca .NET (NuGet)

`UniversalOffice.Core` e `UniversalOffice.Docx` (0.9.1): ler, editar, sanear e
aplicar modelos em .docx e gerar PDF com o mesmo motor de layout do editor.
`UniversalOffice.Xlsx` e `UniversalOffice.Pptx` são empacotados, mas ainda não
publicados. Ver `dotnet/README.md`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `write/` | Write: `docx-core`, `docx-layout` (motor de layout), `editor`, `viewer`, `compare`, labs do Word (`tools/`) — `write/ARCHITECTURE.md` |
| `sheet/` | Sheet: `sheet-core`, `calc`, `sheet` — `sheet/ARCHITECTURE.md` |
| `slides/` | Slides: `slides-core`, `slides`, `viewer` — `slides/ARCHITECTURE.md` |
| `shared/` | Motores comuns: `fonts`, `charts`, `drawingml`, `ui`, `spell` (e os pacotes de dados `font-files`, `spellcheck`, `dictionary-*`) |
| `dotnet/` | Porta .NET (`UniversalOffice.sln`) |
| `site/` | Site estático (landing + documentação) |
| `tools/` | Build de publicação (`build-pkg.mjs`), paridade JS × .NET, fontes, site |

## Desenvolvimento

```bash
npm run install:all   # hooks, fontes locais, dependências e builds dos pacotes comuns
npm run build
npm test
npm run build:pkg     # pastas publicáveis em <pacote>/publish/
```

Regras do repositório (fontes proprietárias, "um lugar só" de cada motor,
pacotes, publicação): `CLAUDE.md`. Histórico: `CHANGELOG.md`. Publicação npm e
NuGet: `docs/publishing.md`.
