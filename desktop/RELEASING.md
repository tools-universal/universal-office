# Releasing the desktop app

**Universal Office (Beta)** is ONE Electron app with the three editors —
Universal Write (.docx, .doc, .odt), Universal Sheet (.xlsx, .xlsm, .xls) and
Universal Slides (.pptx, .ppt):

| | |
| --- | --- |
| Folder | `desktop/` |
| Version | 0.9.2 (`desktop/package.json`) |
| appId | `com.tools-universal.universal-office` |
| Windows AppUserModelIDs | `com.tools-universal.universal-office.write`, `.sheet`, `.slides` (one per editor) |
| Release tag | `desktop-v<version>` |

It is built by GitHub Actions on native runners and published as a **draft
pre-release** on this repository's
[Releases](https://github.com/erichideyuki/universal-office/releases).
Workflow: [`.github/workflows/release-desktop.yml`](../.github/workflows/release-desktop.yml).
Nothing is uploaded to the Linux stores by CI: that needs the owner's store
accounts (see [Linux stores](#linux-stores)).

## How it is put together

- `editors.cjs` — what differs between the editors, as data: page, file
  extensions, save/export formats, theme colours, pop-up and print rules,
  AppUserModelID. `main.cjs` does windows, files, save, export, print, theme
  and close once, driven by it.
- One window per document. A file opened by the OS (association, second
  instance, macOS `open-file`) goes to the editor of its extension.
  `--editor=write|sheet|slides` (the installer shortcuts, the Linux launchers
  and the Jump List tasks use it; the snap launchers set `UO_APP` instead,
  because snapd allows no `=` in an app command) opens that editor's
  **welcome window**; `--new-window` opens a new document; with no file and no
  `--editor`, the welcome window of the last editor used (Write the first
  time). Not `--app=`, a name Chrome uses for its own switch (app mode); it
  is still accepted as an alias.
- **Welcome window** (`welcome/index.html`, one per editor, JetBrains-style,
  frameless with the OS controls overlaid like the editors): the editor's
  icon, name and version, New document/spreadsheet/presentation, Open…, the
  editor's recent files (name, folder, when; search, open with click/Enter,
  remove with × or Delete, clear; files that no longer exist show as
  unavailable), shortcuts to the other two editors, the language selector and
  "Third-party licenses". Light: no editor code loads until a document opens.
  Recents are per editor in the profile (`recents.json`), and still go to the
  OS recent documents / each editor's Jump List.
- **Interface language** (Português (Brasil), English, Español): chosen in
  the welcome window or in the "Idioma / Language" menu that the app adds to
  each editor's bar (through the component's own plugin API, `use()`),
  stored in the profile (`settings.json`). Default: the spell-checking
  language, from the OS locale (pt* → pt-BR, es* → es, otherwise en-US). It
  applies at once, without reloading: the shell's own texts (`i18n.cjs`:
  welcome, native dialogs and their filters, the unsaved-changes prompt,
  Jump List) and the editors' `lang` attribute, which the preload sets as soon
  as the element is parsed and on every change.
- `preload.cjs` gives each page the bridge its demo already uses
  (`window.wordnext`, `window.universalSheet`, `window.universalSlides`) on the
  same `uo:*` IPC channels; the main process applies the editor profile of the
  window that called.
- Packaged resources: `packages/{editor,sheet,slides}/demo` (the three editor
  pages, with their code-split chunks), `fonts/` (the open fonts, ONCE, served
  to the three pages), `icons/` (one icon per editor), `welcome/`,
  `licenses/` (third-party notices, see below), `system-fonts.cjs`,
  `LICENSE.txt`. Proprietary fonts (Aptos, Calibri,
  Arial…) are never packaged: Sheet and Slides read the installed ones at run
  time (Liberation Sans otherwise); Write gets a 404 and uses its metric
  substitutes.
- `electronLanguages`: en-US, pt-BR, es, es-419 (the UI languages; en-US is
  Chromium's fallback).

## Beta naming

What the user sees carries "(Beta)": window titles (`<document> — Universal
Write (Beta)`), the three shortcuts, the welcome windows, "Apps & features"
(`Universal Office (Beta) 0.9.2`), the macOS `CFBundleDisplayName` and dmg
title, the About panel (`0.9.2 beta`), the Linux launchers, the snap title and
the AppStream `<name>`. Artifact names get `-beta`. What must stay stable for
the final release to upgrade in place does **not**: `productName` (install
folder, user profile), `appId`, the AppUserModelIDs, the snap name and the
Flatpak ID. To leave beta, drop `releaseChannel` and `displayName`'s
"(Beta)" in `package.json`, the "(Beta)" strings in `build`,
`build/installer.nsh`, `build/linux/*.desktop` and `flatpak/`, and the
`-beta` in the `artifactName`s.

## One-time setup

The release job publishes with the workflow's own `GITHUB_TOKEN`
(`permissions: contents: write`), so no token is needed for it. Optional
secret on the repository:

- **`SUBMODULES_TOKEN`** (only if `tools-universal/office-converter` is
  private) — PAT with read access to it; the editor pages import the converter
  from the `vendor/office-converter` submodule.

## Cut a release

```bash
git tag desktop-v0.9.2 && git push origin desktop-v0.9.2
```

Or **Actions → Release desktop → Run workflow** and give the tag. The tag must
match the version in `desktop/package.json` (the workflow fails otherwise).
For each OS the workflow installs the shared packages, the three product
workspaces and `desktop/`, rebuilds the three editor pages
(`npm --prefix desktop run build:demos`), runs `npm --prefix desktop run dist`
(icons, license, electron-builder) and, on Linux, also the snap and the
filled-in Flatpak manifest. Review the draft in `universal-office-desktop`
and hit **Publish** (keep "pre-release" ticked while in beta).

## Artifacts and download URLs

`https://github.com/erichideyuki/universal-office/releases/download/desktop-v<version>/<file>`
— e.g. `.../download/desktop-v0.9.2/Universal-Office-0.9.2-beta-Setup.exe`.
Release page: `.../releases/tag/desktop-v0.9.2`. Pre-releases are not
`/releases/latest`: link the tag. The site's links live in one place,
`site/assets/downloads.js`.

| OS | Format | File |
| --- | --- | --- |
| Windows x64 | NSIS installer | `Universal-Office-<version>-beta-Setup.exe` |
| macOS | dmg | `Universal-Office-<version>-beta-arm64.dmg`, `-x64.dmg` |
| Linux | AppImage | `Universal-Office-<version>-beta-x86_64.AppImage`, `-arm64.AppImage` |
| Linux | Debian/Ubuntu | `Universal-Office-<version>-beta-amd64.deb`, `-arm64.deb` |
| Linux | Fedora/openSUSE | `Universal-Office-<version>-beta-x86_64.rpm`, `-aarch64.rpm` |
| Linux | tarball (Flatpak source) | `Universal-Office-<version>-beta-x64.tar.gz`, `-arm64.tar.gz` |
| Linux | Snap Store upload | `universal-office_<version>_amd64.snap` |
| Linux | Flathub submission | `io.github.tools_universal.UniversalOffice.yml` (+ `.metainfo.xml` and the three `.desktop`) |

The `.blockmap` files are for a future auto-updater (none yet).

### What each package installs

- **Windows (NSIS)**: one install folder and one "Apps & features" entry. No
  "Universal Office" shortcut: `build/installer.nsh` creates "Universal Write
  (Beta)", "Universal Sheet (Beta)" and "Universal Slides (Beta)" in the Start
  menu and on the desktop, each `Universal Office.exe --editor=<editor>` with the
  editor's icon and AppUserModelID, so each editor has its own taskbar icon
  and group (the windows set the same ID with `setAppDetails`). File
  associations: .docx/.xlsx/.pptx as default handler, .doc/.odt/.xlsm/.xls/.ppt
  as alternate. Each editor has its own Jump List (recent files + "Novo …").
  The installer follows the Windows language (pt-BR, en-US, es:
  `multiLanguageInstaller`). Verified with a real silent install
  (`/S /D=<folder>`) and uninstall: exactly three Start-menu and three
  desktop shortcuts with the right target, `--editor=`, icon and
  AppUserModelID, no "Universal Office" shortcut, the eight associations and
  one uninstall entry; after uninstalling, shortcuts, ProgIDs, file-type keys,
  uninstall entry and install folder are gone (the classes match the state
  before).
- **macOS (dmg)**: one app, `Universal Office.app`, registered for the eight
  document types; with no document it shows the last editor's welcome window. (One Dock icon:
  macOS has no per-window app identity.)
- **deb / rpm**: three launchers in the menu (`universal-office-write`,
  `-sheet`, `-slides`, each with its MIME types and icon) plus a hidden
  `universal-office.desktop` that handles all eight types (installed with
  `fpm` mappings, see `deb.fpm`/`rpm.fpm`).
- **snap**: four apps — `universal-office` (the generic launcher) and
  `write`, `sheet`, `slides`, each with its own desktop file and icon in
  `meta/gui/` (added to the built snap by `build/snap-apps.cjs`, an
  `afterAllArtifactBuild` hook: electron-builder's snap target declares one
  app; the hook needs `squashfs-tools`). Not verified with a real
  `snap install` (no snapd in the test environment).
- **AppImage**: the format has ONE launcher — "Universal Office (Beta)", which
  opens the last editor's welcome window; files still open in the right editor.
- **Flatpak**: three launchers, named after the app ID
  (`io.github.tools_universal.UniversalOffice.desktop` = Universal Write,
  `.Sheet.desktop`, `.Slides.desktop`).

## Linux stores

IDs: snap name `universal-office`; Flathub ID
`io.github.tools_universal.UniversalOffice` (reverse DNS of
`github.com/tools-universal`; the hyphen becomes `_`). Store IDs never carry
"beta". These replace the per-editor IDs planned before (`universal-write`,
`universal-sheet`, `universal-slides`; `io.github.tools_universal.UniversalWrite`,
`.UniversalSheet`, `.UniversalSlides`) — if any of those were already
registered, release or keep them unused.

### Snap Store

1. Create an Ubuntu One account at <https://snapcraft.io> and register the
   name: `snapcraft register universal-office`.
2. Upload the `.snap` from the release:
   `snapcraft upload --release=beta universal-office_0.9.2_amd64.snap`
   (use the `beta` channel while the app is beta; `edge` for test builds).
3. To let CI upload later: `snapcraft export-login --snaps=universal-office --channels=beta,edge creds.txt`
   and store the content as the secret `SNAPCRAFT_STORE_CREDENTIALS`, then add
   an upload step (`snapcore/action-publish`) to the workflow.

The snap is `strict`, `base: core20`, built from electron-builder's snap
template (default plugs: desktop, home, x11, wayland, network, opengl, audio…).
`removable-media` is not declared: adding `"plugs": ["default", "removable-media"]`
to `build.snap` makes electron-builder need `snapcraft` on the runner
(`sudo snap install snapcraft --classic`). Only an amd64 snap is built (arm64
needs an arm64 runner or `snapcraft remote-build`).

### Flathub

Flathub builds from a manifest in its own GitHub repo, here repackaging the
release tar.gz on `org.electronjs.Electron2.BaseApp` 24.08 (zypak sandbox).
The manifest, AppStream metainfo and the three `.desktop` live in
`desktop/flatpak/`; the tar.gz carries them and the three 512 px icons in
`share/flatpak/` (electron-builder `extraFiles`), and the release has a copy
of the manifest with version, tag and sha256 filled in.

1. Publish the screenshots referenced by the metainfo
   in `desktop/screenshots/` (`universal-write.png`, `universal-sheet.png`,
   `universal-slides.png`, served from
   `https://raw.githubusercontent.com/erichideyuki/universal-office/main/desktop/screenshots/`)
   — Flathub requires them, and the folder does not exist yet.
2. Fork <https://github.com/flathub/flathub>, branch from `new-pr`, add the
   filled-in `io.github.tools_universal.UniversalOffice.yml` and open a PR
   titled "Add io.github.tools_universal.UniversalOffice". Run
   `flatpak run --command=flathub-build org.flatpak.Builder --install <id>.yml`
   and `flatpak-builder-lint` locally first.
3. App-ID ownership: Flathub verifies that you control the GitHub org
   `tools-universal` (verification in the Flathub developer portal after the
   app is accepted). The ID can't change later.
4. Flathub reviewers ask for stable software: while in beta they may route the
   app to the `flathub-beta` repo (PR against the `beta` branch).
5. Finish-args: wayland + fallback-x11, dri, ipc, `--filesystem=home`,
   `/media`, `/run/media` (an editor that saves back to the opened file).
   The host fonts are at `/run/host/fonts` and `/run/host/user-fonts` inside
   the sandbox; `shared/fonts/node/system-fonts.cjs` scans both.

### AppImageHub

Open a PR at <https://github.com/AppImage/appimage.github.io> adding
`data/Universal_Office` with one line: the URL of the GitHub releases page
(`https://github.com/erichideyuki/universal-office/releases`).
Their CI downloads the newest AppImage and checks its `.desktop`/AppStream.

## Building and testing locally

```bash
npm run install:all                        # shared packages + the three products
npm ci --prefix desktop
npm --prefix desktop run build:demos       # the three editor pages
npm --prefix desktop start -- --editor=sheet  # dev run (or a file path, or nothing)
npm --prefix desktop run smoke             # dev smoke, hidden windows
npm --prefix desktop run dist              # installers for the current OS
npm --prefix desktop run smoke:packaged    # the packaged app, three editors
```

(Electron 42's npm package no longer downloads its binary on install; if
`desktop/node_modules/electron/dist` is missing, run
`node desktop/node_modules/electron/install.js` — the packaged build doesn't
need it, electron-builder fetches `build.electronVersion` itself.)

- `smoke` (`build/smoke.mjs`) runs the shell in dev with hidden windows and an
  isolated profile: single instance, a .docx from argv, second instances
  forwarding a .docx (MOTW read and kept on save), an .xlsx and a .pptx
  (routed to Sheet and Slides), the ack of `onOpenFile` (refusal, reload),
  native save on the known path and refusal of unknown paths, the isolated
  print window, navigation and pop-up guards, `--editor=` (the editor's welcome
  window, with its own recents), `--new-window`, the language switch (welcome →
  the open editors' `lang`, the injected "Idioma" menu, `settings.json`) and,
  with no arguments, Write's welcome window and its "New document".
- `smoke:packaged` (`build/smoke-packaged.mjs`) runs the packaged executable
  with a .docx, then hands an .xlsx and a .pptx to it as second instances,
  connects over the DevTools protocol and checks, per editor window: the file
  opened, only that editor's bridge, the open fonts served from `resources`,
  the component bar (title above the menus, File menu, status bar, drag area,
  right-side actions clear of the window controls) and — Write — pt-BR and
  en-US spell checking offline; it saves a PNG per editor. Then it hands
  `--editor=sheet` to the app: Sheet's welcome window (icon, name, its recents,
  languages, licenses) and a switch to Spanish there, which must reach the
  welcome window and the three editors at once (with `--es`, also the
  editors' Spanish UI and Spanish spell checking, Write's
  `spellcheck-default-lang="es-ES"` and a new Write document — `--editor=write
  --new-window` — whose typed text is checked in Spanish). `--app <editor>` checks
  one editor only; `--exe` takes e.g. an AppImage with
  `--extra "--appimage-extract-and-run --no-sandbox"` (then also set
  `NO_CLEANUP=1`: the second instance would delete the shared extraction
  folder on exit) or `opt/Universal Office/universal-office` from an extracted
  .deb. Headless on Linux:
  `--extra "--no-sandbox --ozone-platform=headless --ozone-override-screen-size=1600,1000"`.
- On Linux, the rpm target needs `rpmbuild` (`apt install rpm`).

## Notes

- **Electron version**: `build.electronVersion` (42.5.2) and the dev
  `electron` dependency are pinned together; bump both.
- **`npmRebuild: false`**: the app has no runtime dependencies (the editor
  pages are prebuilt bundles copied with `extraResources`).
- **Unsigned** builds: Windows shows SmartScreen ("Windows protected your
  PC" → More info → Run anyway), macOS Gatekeeper (right-click → Open, or
  `xattr -dr com.apple.quarantine`). To sign, add the certificates as secrets
  and configure `win.certificateFile` / macOS notarization in `build`.
- **Linux sandbox**: the .deb installs `chrome-sandbox` setuid. Ubuntu 24.04
  restricts unprivileged user namespaces (AppArmor), so an AppImage may need
  `--no-sandbox`; Ubuntu 22.04+ also needs `libfuse2` to mount AppImages
  (or `--appimage-extract-and-run`).
- **Theme**: the windows open in the OS theme (`nativeTheme`, no white flash)
  in their editor's bar colour and follow the OS until the page reports its
  own theme.
- Icons are generated at build time from the REAL app icons,
  `site/assets/icons/{universal-office,write,sheet,slides}.svg`, by
  `build/gen-icons.mjs`, which rasterizes them with Electron's Chromium
  (`build/rasterize-icons.cjs`, an offscreen window — nothing shows): the SVGs
  use CSS (`color-mix`, `currentColor`, selectors) that librsvg/sharp don't
  draw. Out: the app icon (`universal-office.svg`), one icon per editor
  (`build/editor-icons/`, not `build/icons/`, which electron-builder reserves
  for Linux icon sets) and the eight file-type icons (a page with the editor's
  icon and the format's colour), each size drawn natively. On Linux CI it runs
  with `--ozone-platform=headless`.
- **Licenses**: `build/gen-licenses.mjs` (predist) collects the notices of
  everything the app bundles into `resources/licenses/` with an index,
  `THIRD-PARTY-NOTICES.txt` (opened by "Third-party licenses" in the welcome
  windows; also in the About panel credits): Hunspell and the emscripten
  runtime, the pt-BR/en-US/es dictionaries, the hyphenation patterns,
  Liberation/Carlito/Caladea, Poppins, Amatic SC and Material Symbols (these
  three had no license file in the repo: the notice carries the OFL 1.1 /
  Apache 2.0 text), fflate and office-converter. Electron/Chromium ship their
  own (`LICENSE.electron.txt`, `LICENSES.chromium.html`). In CI a missing
  notice fails the build.
- **Headless Linux testing**: under `--ozone-platform=headless` a window WITH a
  native frame crashes Chromium; all the app's windows are frameless, so the
  smoke tests run headless. The NSIS license page is the root `LICENSE` (MIT), copied to
  `build/mit-license.txt` — not `license.txt`, which the AppImage/dmg targets
  would show as an EULA.
