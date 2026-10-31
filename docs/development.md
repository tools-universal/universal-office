# Desenvolvimento

Guia de manutenção do repositório da Universal Office
(<https://github.com/erichideyuki/universal-office>). A vitrine pública é o
`README.md` da raiz e o site <https://universaloffice.org/> (o conteúdo de
`site/`, em inglês). A pasta do repositório ainda se chama `OfficeNext`, nome
antigo do projeto — não usar em código, pacote ou doc novos.

Suíte de escritório com compatibilidade de formato e renderização fiel ao
Office: editor de texto (Write, .docx), planilha (Sheet, .xlsx) e apresentação
(Slides, .pptx). Cada editor existe como **web component**, como **app
desktop** e, para servidor, como **biblioteca .NET**. Licença MIT (`LICENSE`).

Regras do repositório (fontes proprietárias, "um lugar só" de cada motor,
pacotes, publicação): `CLAUDE.md`. Histórico: `CHANGELOG.md`. Publicação npm e
NuGet: `docs/publishing.md`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `write/` | Write: `docx-core`, `docx-layout` (motor de layout), `editor`, `viewer`, `compare`, labs do Word (`tools/`) — `write/ARCHITECTURE.md` |
| `sheet/` | Sheet: `sheet-core`, `calc`, `sheet` — `sheet/ARCHITECTURE.md` |
| `slides/` | Slides: `slides-core`, `slides`, `viewer` (o `@universal-office/slides-viewer`) — `slides/ARCHITECTURE.md` |
| `shared/` | Motores comuns: `fonts`, `charts`, `drawingml`, `ui`, `spell` (e os pacotes de dados `font-files`, `spellcheck`, `dictionary-*`) |
| `desktop/` | App desktop (Electron) da suíte: os três editores num app só — `desktop/RELEASING.md` |
| `dotnet/` | Porta .NET (`UniversalOffice.sln`) — `dotnet/README.md` |
| `site/` | Site estático (landing + documentação), publicado em <https://universaloffice.org/> |
| `tools/` | Build de publicação (`build-pkg.mjs`), paridade JS × .NET, fontes, site, GIFs |
| `vendor/office-converter` | Submódulo git do conversor de formatos (`git submodule update --init`) |
| `docs/` | Este guia e o passo a passo de publicação |

## Comandos

```bash
npm run install:all   # hooks, fontes locais, conversor, dependências e builds dos pacotes comuns, app desktop
npm run build
npm test
npm run build:pkg     # pastas publicáveis em <pacote>/publish/
npm run docs:site     # páginas do site geradas a partir dos READMEs dos pacotes
npm run docs:gifs     # regrava os GIFs de site/assets/gifs
npm run desktop       # app desktop em dev (-- --editor=sheet, um arquivo, ou nada: boas-vindas)
```

As fontes proprietárias (Aptos, Calibri…) nunca entram no repositório: o
`npm run fonts:sync` (parte do `install:all`) copia as instaladas na máquina
para as pastas locais, que estão no `.gitignore` (ver `CLAUDE.md`).

## Web components (npm)

Todos os pacotes saem com a MESMA versão (hoje 0.9.2), inclusive os NuGet.

| Pacote | Componente | Versão |
|---|---|---|
| `@universal-office/write` | `<universal-write>` (editor .docx; entrada `./viewer` só com o viewer) | 0.9.2 |
| `@universal-office/document-viewer` | `<universal-document-viewer>` (só leitura, .docx/.doc) | 0.9.2 |
| `@universal-office/compare` | `<universal-write-diff>` + motor de diff de .docx | 0.9.2 |
| `@universal-office/slides-viewer` | `<universal-slides-viewer>` (.pptx/.ppt; substitui o `@universal-office/presentation-viewer`, depreciado) | 0.9.2 |
| `@universal-office/sheet` | `<universal-sheet>` (editor .xlsx) | 0.9.2 |
| `@universal-office/slides` | `<universal-slides>` (editor .pptx) | 0.9.2 |
| `@universal-office/font-files` | fontes abertas métrico-compatíveis (OFL-1.1 e Apache-2.0) | 0.9.2 |
| `@universal-office/spellcheck`, `@universal-office/dictionary-pt-br`, `@universal-office/dictionary-en-us` | revisão ortográfica opcional do write (Hunspell em WASM e dicionários) | 0.9.2 |
| `@universal-office/dictionary-es` | dicionário do espanhol (RLA-ES, todas as variantes) da revisão ortográfica | 0.9.2 |

O manifesto publicado (gerado pelo `tools/build-pkg.mjs`) leva `homepage`
(<https://universaloffice.org/>), `repository` (este repositório, com a pasta
do pacote), `bugs` e `funding` (GitHub Sponsors).

A documentação de cada produto é o README do pacote (em inglês, vai no npm) e
o site (`site/`): `npm run docs:site` (`tools/site/gen-docs.mjs`) gera as
páginas do `document-viewer`, do `sheet`, do `slides` e do `slides-viewer` a
partir dos READMEs e reescreve a barra lateral de todas; as páginas do Write
(`site/docs/write/`) e do diff (`site/docs/universal-write-diff/`) são escritas
à mão. Página gerada não se edita: muda-se o README e roda-se o gerador.

## Biblioteca .NET (NuGet)

`UniversalOffice.Core` e `UniversalOffice.Docx` (0.9.2): ler, editar, sanear e
aplicar modelos em .docx e gerar PDF com o mesmo motor de layout do editor.
`UniversalOffice.Xlsx` e `UniversalOffice.Pptx` são empacotados, mas ainda não
publicados. Metadados comuns (versão, `PackageProjectUrl`, `RepositoryUrl`) no
`dotnet/Directory.Build.props`. Ver `dotnet/README.md`.

## App desktop (Beta)

Os três editores saem juntos num app desktop só, o **Universal Office (Beta)**
0.9.2 (`desktop/`), para Windows (instalador), macOS (dmg, Apple Silicon e
Intel) e Linux (AppImage, deb, rpm, tar.gz e Snap; Flathub planejado). Uma
instalação, um runtime, três editores, cada um com o seu atalho, ícone e
janela:

| Editor | Abre |
| --- | --- |
| **Universal Write (Beta)** | .docx, .doc, .odt; corretor pt-BR, en-US e es embutido |
| **Universal Sheet (Beta)** | .xlsx, .xlsm, .xls; exporta PDF, ODS, CSV, TSV, HTML, Markdown e XML 2003 |
| **Universal Slides (Beta)** | .pptx, .ppt; apresentação com animações |

Download: [Windows](https://github.com/tools-universal/universal-office-desktop/releases/download/desktop-v0.9.2/Universal-Office-0.9.2-beta-Setup.exe)
· [todos os formatos](https://github.com/tools-universal/universal-office-desktop/releases/tag/desktop-v0.9.2)

O instalador do Windows cria os atalhos "Universal Write (Beta)", "Universal
Sheet (Beta)" e "Universal Slides (Beta)"; cada um abre as boas-vindas do
editor (novo, abrir, recentes, idioma), e o arquivo aberto pelo sistema vai
para o editor da sua extensão. Interface em português, inglês ou espanhol
(nas boas-vindas ou no menu Idioma de cada editor, guardada no perfil;
padrão: o idioma do sistema). Linha de comando: `--editor=write|sheet|slides`
abre as boas-vindas do editor (`--app=` é apelido), `--new-window` abre um
documento novo e os arquivos passados abrem no editor da extensão. No Linux, o
deb, o rpm e o Flatpak instalam os três lançadores; o AppImage tem um só (as
boas-vindas do último editor usado). O app funciona offline: as fontes abertas
vão junto, as do sistema (como a Calibri) são lidas da máquina e nunca
distribuídas, e o tema segue o claro/escuro do sistema. Os builds ainda não
são assinados, então o SmartScreen e o Gatekeeper avisam na instalação.

- **Lojas Linux:** Snap Store (`universal-office`, canal beta), Flathub
  (`io.github.tools_universal.UniversalOffice`, com os três lançadores) e
  AppImageHub. A publicação nas lojas ainda é manual.
- **Releases:** saem da tag `desktop-v<versão>` pelo workflow "Release
  desktop" (`.github/workflows/release-desktop.yml`) para
  `tools-universal/universal-office-desktop`, como pré-lançamento. Passo a
  passo, testes (`smoke`, `smoke:packaged`) e configuração das lojas em
  `desktop/RELEASING.md`.
- No site, os links de download ficam num lugar só: `site/assets/downloads.js`.
