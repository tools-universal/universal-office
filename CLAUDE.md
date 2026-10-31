# Universal Office — repository rules

## Name, license and what goes into the library

- **Name**: the product is **UniversalOffice** / Universal Office (the folder is
  still called `OfficeNext`, the old name — do not use it in new code, packages
  or docs). npm: scope `@universal-office/*`. .NET: projects, assemblies and namespaces `UniversalOffice.*`
  (`UniversalOffice.Layout` became `UniversalOffice.Fonts`), solution
  `dotnet/UniversalOffice.sln`.
- **License**: MIT on EVERYTHING (`LICENSE` at the root, copyright Eric Kono) — no
  paid edition and no non-commercial clause. The only exceptions are
  third-party data, each with its license texts in its own package:
  `@universal-office/font-files` = `OFL-1.1 AND Apache-2.0` (Liberation and
  Carlito OFL, Caladea Apache), Hunspell `MPL-1.1 AND MIT` (with the
  emscripten runtime), pt-BR dictionary MPL-1.1, en-US SCOWL license, es
  `GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+`, hyphenation patterns
  from hyph-utf8 (notices in `THIRD-PARTY-NOTICES.md`, on npm and on
  NuGet).
- **Nothing consumer-specific in the library**: code that only serves one
  host app (e.g. clickCompliance's conversion of Quill Delta/HTML to .docx)
  stays IN the host. The library offers the generic API
  (in .NET: `DocxBodyWriter`, `DocxRunFormat`, `DocxParagraphFormat`,
  `DocxParagraphProperties`, `DocxParagraphSamples`; in the editor: plugins,
  `formatting-policy`, the `side` slot, `setNotice`, the bar kit).
- **History and publishing**: what changes in each version goes in the root
  `CHANGELOG.md`; the npm and NuGet step-by-step is in `docs/publishing.md`.
- **Repository, site and README**: the repository is
  `https://github.com/erichideyuki/universal-office` (it left the
  `tools-universal` organization; only the `tools-universal/office-converter`
  submodule stays there). Desktop releases are published on this repository's
  Releases by `.github/workflows/release-desktop.yml`, and the desktop IDs use the
  project's domain: app ID and Flatpak ID `org.universaloffice.UniversalOffice`
  (Windows AppUserModelIDs `<appId>.write`/`.sheet`/`.slides`). The site is
  `https://universaloffice.org/` (the content of `site/`, in English). The root
  `README.md` is the public SHOWCASE, in English (products, quick start,
  packages, desktop app, sponsorship); maintenance material (structure,
  commands, the desktop app in detail) lives in `docs/development.md`. All
  `.md` files in the repository are in English.
  `homepage`/`repository`/`bugs`/`funding` of the npm packages come from `PROJECT`
  in `tools/build-pkg.mjs`, and `PackageProjectUrl`/`RepositoryUrl` of the NuGet packages from
  `dotnet/Directory.Build.props`. Sponsorship: GitHub Sponsors
  (`https://github.com/sponsors/erichideyuki`, `.github/FUNDING.yml`).

## Proprietary fonts: NEVER commit

No proprietary font file goes into the repository — not in a lab, fixture,
demo or site folder, and not through a "temporary" commit. This applies to
any Microsoft/Monotype font (Aptos, Aptos Narrow, Aptos Display,
Calibri, Arial, Segoe, Cambria, Tahoma, Times New Roman…) and to any
commercial font (e.g. Proxima Nova) or font with restricted embedding. The license
embedded in them ("Microsoft supplied font") only allows using them in the product
they came with and embedding them in documents; the font FILE cannot be
redistributed — a private repository is also distribution. Disguised copies
are not allowed either: extracted `.odttf` files, an Office document used as a
container to extract the font, a bundle with the font in base64.

- **Local use** (demos, fidelity labs, PDF tests): `npm run
  fonts:sync` copies the fonts installed on the machine (Windows\Fonts, user
  fonts, the Office 365 CloudFonts cache) to the paths the code
  expects — all in `.gitignore`. Without them, the app falls back to the open substitute
  (Liberation Sans) and the tests use versioned open fonts.
- **Automatic blocking** (by content, not just by name):
  `tools/fonts/check-fonts.mjs`, run by the pre-commit hook
  (`.githooks/`, enabled by `npm run hooks:install` / `npm install` at the root)
  and by CI (`.github/workflows/fonts.yml`). Never work around it with `git add -f`,
  `--no-verify` or by changing the checker so it passes.
- **Open fonts** (OFL, Apache, Ubuntu Font Licence…) may be
  versioned. If the file does not declare its license in a readable way (or is
  EOT/`.fntdata`), record sha256 + license + origin in
  `tools/fonts/allowed-fonts.txt`.
- **Sample documents** (`.pptx`/`.docx`/`.xlsx`) with an EMBEDDED font only
  go in if the license of each font allows embedding (fsType 0/8) — and
  they also have to be listed in `allowed-fonts.txt`. Third-party template decks
  with embedded commercial fonts stay out of the repository.
- Found a proprietary font that is already versioned? Deleting it at the tip is not enough:
  it stays in the history — report it so the history can be rewritten.

## Font resolution: one place only

Write, Sheet and Slides resolve fonts the SAME way, in `shared/fonts`
(`@universal-office/fonts`) — do not reimplement it in the apps. That is where the
web component resolver lives (`FontResolver`: host → Local Font Access →
embedded → page `@font-face` → installed by name → metric-compatible
substitute → Liberation Sans; Write uses `getWithFile`: it measures and
embeds only with the font FILE, so "installed by name" becomes the
substitute, the same on screen and in the PDF), the desktop app's OS fonts
module (`node/system-fonts.cjs`) and the OPEN substitutes (`files/`:
Carlito, Caladea, Liberation Serif/Mono — `npm run fonts:sync` copies them to the
demos/site). Fonts embedded in the document stay with each component.
The "fonts in the file" option is also a single implementation (`embedding.ts` decides what
goes in, `ooxml.ts` writes .docx/.pptx; the dialog of both apps is
`shared/ui/src/font-embedding-dialog.ts`);
Sheet does not have it — .xlsx does not store fonts (Excel does not offer it).
Measured facts that guide the design: `document.fonts.check` returns `true` for
any family (it cannot tell whether the font exists); no browser
sees the Office font cache (Aptos); only Chromium enumerates/gives bytes
(`queryLocalFonts`, with permission); Firefox private/strict ETP only sees the
base system fonts.

## Charts and number formatting: one place only

DrawingML charts (`c:chartSpace`) and Office number formatting live in
`shared/charts` (`@universal-office/charts`) — Slides and Sheet use the SAME
engine; do not reimplement it in the apps. The host app hands over the already
parsed XML tree and its own theme color resolver (the app's clrMap/modifiers);
the engine does layout, scaling and painting on canvas. Facts measured against the oracle
(PowerPoint 365 pt-BR, the lab's synthetic charts): an area without `spPr` is
transparent in PowerPoint; a line without `c:smooth` comes out SMOOTH; series past the 6th and
monochromatic styles vary in linear RGB; the short date "m/d/yyyy" follows the
locale.

## DrawingML shapes and effects: one place only

The preset shapes (the official definitions, `preset-defs.ts`), the color
modifiers (`applyColorMods`: shade/tint in linear RGB — applies to Word too), the
raster effects (shadow, glow, soft edges, reflection), the 3D bevel (lighting
measured in PowerPoint and, for images, in Word), the Office 2010 image
adjustments and the wrap contour live in `shared/drawingml`
(`@universal-office/drawingml`) — Slides and Write use the same; do not reimplement it
in the apps. .NET (namespace `UniversalOffice.DrawingML`, in the `UniversalOffice.Core` package) reads the SAME tables from the TS files
as an embedded resource. Charts and slides-core still have their own copies of the
color math (moving them here is a follow-up).


## Viewer controls: one place only

The viewers' control bar (`<universal-slides-viewer>`,
`<universal-document-viewer>`) lives in `shared/ui`
(`@universal-office/ui`, `viewer-controls.ts`): buttons, progress, counter,
auto-hide, SVG icons and the CSS. Each viewer declares only its own items.
Model agreed with the user: visible by default; `nocontrols` turns everything off;
one boolean attribute per item (`nodownload`, `nofullscreen`…) — no
`controlslist`. `--upv-*`/`--udv-*` variables with fallback to the common `--uo-*` ones;
`::part()` for the rest. The canvas for Write pages is also a single one:
`paintItems` in `docx-layout/src/canvas.ts` (editor and viewer).

## Editor bars: one place only

The editor bar framework lives in `shared/ui/src/toolbar`
(`@universal-office/ui`): command registry (label `{ en, pt, es }`, icon,
shortcut, `supports`/`isEnabled`/`isChecked`/`run`), a Google Docs-style COMPACT
bar (menus + a row that collapses by priority — `data-prio`, triggers, "⋮",
"☰") and a Word-style RIBBON (tabs, groups with a launcher, contextual tabs),
menus/submenus (the single engine — do not copy menu.ts/context-menu.ts into the demos),
a dialog on top of the native `<dialog>` (u-dialog hangs on close without an
animation clock), notices, gallery, side panel (`pane.ts`), the RULER (`ruler.ts`:
margins, indents, tab stops, columns/cells, dragging with snapping and the tab
selector — the app only provides the geometry in twips) and the Material Symbols
as SVG (`symbols.ts`, generated by
`shared/ui/tools/extract-symbols.py`). Everything works inside a shadow root
(outside clicks via `composedPath()`). The app only DECLARES commands on top of its own
API and the layouts: Write in `editor/src/chrome-*.ts`, Sheet in
`sheet/packages/sheet/src/chrome-*.ts` and Slides in
`slides/packages/slides/src/chrome-*.ts`, all three wired through the same attributes
(`topbar`, `bottombar`, `toolbar="compact|ribbon"`, compact by default, with the
title above the menus — `titlePlacement` is `'above-menus'` whenever there is a
title, also in the minimal row of `createBarRow`, and `'inline'` only when
requested) and loaded on demand; without the attributes the element
does not mount any bar. All three have the full menus ("Arquivo · Editar ·
Exibir · Inserir · Formatar… · Ajuda" in the Portuguese interface: File · Edit · View ·
Insert · Format… · Help) and the ribbon with the Office tabs; in
Slides the notes pane edits the slide notes (`setSlideNotes`). A command whose API does not exist yet stays hidden
(`supports = typeof editor[m] === 'function'`) — a new workstream only implements the
method. What depends on the host app (the desktop app) comes in through the optional `element.host`
(in Slides, `appHost`, because the viewer already uses `host` for the shadow
root), with the web path as the fallback; the demo only hosts the component. The tests
for the Sheet and Slides bars use Write's fake DOM
(`write/test-support/fake-dom.ts`), so they need Write's `node_modules`.

## Interface language: one place only

The INTERFACE texts of all web components (`<universal-write>`,
`<universal-sheet>`, `<universal-slides>`, the two viewers,
`<universal-write-diff>`, the fonts dialog and the mentions plugin) pick
the language in `shared/ui` (`@universal-office/ui`, `i18n.ts`) — do not reimplement it in the
apps. Languages: English, Portuguese and Spanish (`UiLang = 'en' | 'pt' | 'es'`;
`es`, `es-ES`, `es-419`, `es-MX`… → neutral Spanish with the Office
terminology in Spanish and the "tú" of Microsoft 365). Rule agreed with the user:
English by default; the 1st translated language in `navigator.languages` (pt-* →
Portuguese, es-* → Spanish); the `lang` attribute on the element ITSELF forces it
(`lang` on an ancestor, such as `<html lang>`, does not count; a language without a translation falls
back to English). Each component keeps its own `{ en, pt, es }` table and uses
`pickLabels`/`uiLang`; the tables are `Record<UiLang, …>` (and the helpers
`L`/`tr` require all three texts), so a label without Spanish does not compile — a new
language goes into `UiLang` and the compiler points out the rest. For the OUTSIDE (host
plugins, `Lbl`, `createBarButton`) the label is a `LabelTable` `{ en, pt, es? }`:
`es` is optional and, without it, the Spanish interface shows the English text — do not
make it required, that breaks hosts. Measurements and numbers OF THE
INTERFACE (cm × inches, decimal comma, revision dates) follow
`uiLocale`/`uiDecimal` (pt and es = metric with a comma; en = inches with a
period) — do not compare `lang === 'pt'`. Keyboard shortcuts are the same in
all languages. This is only the interface: numbers, dates and function names in
Sheet follow `formula-locale` (formula error messages too, as in
Excel), which only has pt-BR (oracle) and en-US — there are no Spanish function
names —, and data fidelity is still pt-BR. The Spanish names of
Word's built-in styles (`docx-core/style-names-es.ts`) and the Spanish watermark
texts are written by hand (there is no es oracle).

## Light/dark: one place only

The light/dark theme of `<universal-write>` and `<universal-document-viewer>`
lives in `shared/ui` (`color-scheme.ts`). Rule agreed with the user: the
component follows the CSS `color-scheme` property of the CONTEXT (inherited from the
page, it crosses the shadow DOM) — it never looks for classes (`u-dark`/`u-light`
from @universal-material only change `color-scheme`). The colors are
`--u-color-*` tokens or `light-dark()`, so switching is CSS only; without `color-scheme`
the browser's applies (`normal` = light) and `light dark` follows the OS. `theme=
"light|dark"` forces it (sets `color-scheme` on the host); `auto`/absent inherits.
The JS that needs the theme (canvas, window controls, the
`uw-theme-change`/`udv-theme-change` event, the `effectiveTheme` getter) uses
`ColorSchemeWatcher`: it probes `light-dark(rgb(0,0,1), rgb(0,0,2))` read through
`getComputedStyle` + a 1 ms transition (`transitionend`) + `matchMedia` +
ResizeObserver (an element with `display:none` does not transition) — measured in
Chromium; no polling and no MutationObserver. The document page stays
white in dark mode (full dark/`setDarkPage` is an option). A SINGLE background (Google
Docs/Drive style): desk, bars, ruler and panels in `--uw-background` /
`--udv-background` (default `--u-color-surface-container-low`).

## Spell checking: one place only

Spell checking for all apps lives in `shared/spell`
(`@universal-office/spell`): Hunspell 1.7.2 in WASM in a Worker, open
LibreOffice dictionaries (pt-BR VERO, en-US SCOWL, es RLA-ES — one `es` for
all variants) loaded on demand, language
by BCP 47 tag (`w:lang`) and a user dictionary stored by the
host. The engine and the dictionaries come from a page registry
(`src/sources.ts`): when published, they are separate and OPTIONAL packages
(`@universal-office/spellcheck`, `@universal-office/dictionary-<id>`), which the
host registers by loader (`registerSpellcheck`/`registerDictionary`) or by
folder (`spellcheck-url`); without them, there is no spell checking. Tests and demos use
`registerBuiltinSources()` (pt-BR, en-US and es; `PUBLISHED_DICTIONARIES` is the
default list for `spellcheck-url`). In Write, text whose language the document does not
state (no `w:lang` on the run, in the styles or in the defaults) is checked in
`spellcheck-default-lang` (default `pt-BR`, `DEFAULT_SPELL_LANG` in
`editor/src/spell.ts`), and `newDocument()` is created in that language
(`blankDocxPackage({ lang })` writes the `w:lang` of the defaults and
`w:themeFontLang`, like Word with the editing language); the desktop app puts the
interface language there (`es` → `es-ES`). New dictionary: step-by-step in
`shared/spell/src/dicts/README.md`. Rule agreed with the user: ONLY Hunspell, also in
Electron (the desktop app turns off Chromium's spell checker in the Write window:
`webPreferences.spellcheck: false`). In Write, `editor/src/spell.ts` only resolves language/noProof per run and
keeps the errors per paragraph; the underline is an on-screen adornment of the editor (not of
`paintItems` — never in the PDF, in printing or in the viewer). Measured:
nspell cannot load the VERO .aff (more than 5 min and more than 1 GB); the choice and the
numbers are in the package README.

## Desktop app: one place only

`desktop/` is the ONLY Electron app: the Universal Office (Beta) suite, with the
three editors in one executable (one window per document; the extension decides the
editor). What changes from one editor to another is DATA in `desktop/editors.cjs`
(page, extensions, save/export formats, theme, pop-ups, printing,
AppUserModelID); `main.cjs` does windows, files, saving, exporting,
printing, theme and closing once — a new editor or a new format goes into the
profile, not into another `if`; text the user sees lives in `desktop/i18n.cjs`
(pt-BR, en-US, es). `preload.cjs` (sandboxed, does not import local
files) exposes each page's bridge with the names the demo and the component
host already use (`wordnext`, `universalSheet`, `universalSlides`):
renaming breaks both. The interface language belongs to the app (welcome screen and the Language
menu injected through each component's `use()` API) and reaches the editors
through the `lang` attribute, which the preload applies; the editor itself does not store a
language. The icons come from `site/assets/icons` rasterized by Chromium
(`build/gen-icons.mjs`) — do not redraw icons in the app. The editor switch is
`--editor=` (`--app=` is a Chrome switch name; it stays only as an alias; the
snap launchers use `UO_APP`, because snapd does not accept `=`), and
`--new-window` opens a new document. The open fonts ship only once
(`resources/fonts`, served to the three demos); a proprietary font never goes into
the package — the server reads the one installed in the OS (Sheet/Slides) or returns 404
(Write uses the metric substitute). Tests: `npm --prefix desktop run smoke`
(dev, hidden windows) and `smoke:packaged` (the three editors in the packaged
executable, with a 2nd instance). Release: tag `desktop-v<version>`
(`desktop/RELEASING.md`).

## Packages: a boundary only with a reason

There are 16 packages (consolidated on 2026-10-19 from 21; `spell` and `drawingml` came in later). A new package only
comes in with a real reason: (1) it is a separate PRODUCT — a web component
published on its own; or (2) it is an engine used by more than one
app or without DOM outside the apps (`fonts`, `charts`, `ui`, `spell`, `sheet-calc`, `drawingml`). The rest
stays as a folder inside the owning package: format conversions in
`<app>-core/src/export` (and `docx-core/src/odf`), Write's typographic base and PDF
in `docx-layout/src/typography` and `src/pdf-writer`. Modules moved
into a core import from `../core.js` (not from `index.ts`), to avoid creating a
cycle. Code that only delegates to office-converter (`vendor/`) justifies neither a
package nor a local copy — and the cores have `sideEffects: false` so the converter
does not end up in the bundles of those who do not use it.

Publishing: the 6 PRODUCTS (`write`, `document-viewer`,
`compare`, `sheet`, `slides-viewer`, `slides`) and the DATA packages
(`font-files` in `shared/fonts/packages/`; `spellcheck`, `dictionary-pt-br`,
`dictionary-en-us` and `dictionary-es` in `shared/spell/packages/`) go to the registry. `npm run build:pkg`
(`tools/build-pkg.mjs`) generates `<package>/publish/` (outside git). Each product
carries all its code inside: internal packages from src, npm dependencies, on-demand
parts in `chunks/`, a single `.d.ts` per entry (write has two:
`index.js` = editor, `viewer.js` = only `<universal-document-viewer>`, with the
shared chunks). The only dependency of the products with fonts is
`@universal-office/font-files`, at the EXACT version; the open fonts no longer go
inside each product. The spell-checking engine and dictionaries never go
into a product (the build fails) and write does not depend on them.
Publish from inside `publish/` (`npm pack` in there and `npm publish
<tgz> --access public`; see `docs/publishing.md`). Since 0.9.2 all
packages (the 6 products and the data packages, and the NuGet packages) ship with the SAME version;
`slides-viewer` replaced `presentation-viewer` (published only as 0.0.1,
deprecated on npm), and the Slides viewer is `<universal-slides-viewer>`
(class `UniversalSlidesViewerElement`). Versions move
together: `write` and `document-viewer` always at the same version (write carries the
viewer as its 2nd entry), the `slides`/`slides-viewer` pair too, and
`font-files` is published BEFORE the products at the version they require (exact).
The 10 internal packages are `private` and are never published. `dist/` is something else: tsc output that the monorepo packages
consume from each other (build order: write → slides → sheet; Sheet uses
slides-core's `dist/`).

Product documentation: each product's README is the SINGLE source. The site
(`site/docs/<product>/`) is generated from it by `npm run docs:site`
(`tools/site/gen-docs.mjs`, which also maintains the sidebar of all
docs pages); only the `<universal-write>` and diff pages are written
by hand. The GIFs live only once in `site/assets/gifs/` and are re-recorded by
`npm run docs:gifs` (`tools/gifs/record.mjs`: headless Chromium over the
packages in `publish/`, English sample documents generated on the fly);
`build:pkg` copies each GIF to the package's `publish/media/`.

## .NET: a port with parity

`dotnet/` (`UniversalOffice.sln`, net8.0, no NuGet dependencies in `src/`) is the
.NET port of the three formats, with parity tested against the JS (see
`dotnet/README.md`). Four NuGet packages, common metadata in
`dotnet/Directory.Build.props` (version = that of the npm packages): `UniversalOffice.Core`
(Core + Fonts + Pdf + DrawingML) and `UniversalOffice.Docx` (Docx + Editing +
DocxLayout + DocBinary + the docx exporters), published on nuget.org;
`UniversalOffice.Xlsx` and `UniversalOffice.Pptx` are packed
(`dotnet pack -c Release`), but not published yet. `JsPath` (port of Node's
`path`, `Core/Fonts/JsCompat.cs`) is win32 only on Windows, for parity
with the JS; elsewhere it joins with the OS separator — with `\` on Linux no
font folder was found and the server PDF failed (test in
`SystemFontIndexTests`). On the Linux server the metric substitutes
(`fonts-liberation`, `fonts-crosextra-carlito`, `fonts-crosextra-caladea`) are
installed in the OS; they do not come in the NuGet package. The layout engine exists
on both sides (`write/packages/docx-layout` and `UniversalOffice.Docx/DocxLayout`):
a new rule is measured in Word (`write/tools/layout-oracle`, cases in
`test/oracle/<group>`), goes into the JS, is ported to .NET and the parity dumps
are regenerated (`tools/gen-parity-layout.mjs`). The measured rules and the
known differences from Word are in the docx-layout README.

## Write editor features: backlog and workflow

The gaps of `<universal-write>` relative to Word and the agreed workflow to
close them are in `write/BACKLOG.md`: each workstream in a session with its own
worktree (approved scope → measure against the oracle → API → render → lossless save
→ interface → tests → docs → delivery), up to 4 in parallel. A worktree is set up
with `node tools/parallel/worktree-setup.mjs --build` and torn down with
`worktree-teardown.mjs` (never `rm -rf`); all Office use via COM goes
through `tools/parallel/word-lock.mjs`. Workstream sessions do not commit versioned
bundles nor edit the BACKLOG: the coordinating session merges into main,
rebuilds and updates the status.
