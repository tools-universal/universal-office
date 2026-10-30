# Releasing the desktop apps

Three Electron apps, each with its own folder, version and release:

| App | Folder | Version | appId | Opens |
| --- | --- | --- | --- | --- |
| **Universal Write (Beta)** | `write/apps/electron` | 0.9.1 | `com.tools-universal.universal-write` | .docx (default), .doc, .odt |
| **Universal Sheet (Beta)** | `sheet/apps/electron` | 0.0.1 | `com.tools-universal.universal-sheet` | .xlsx (default), .xlsm, .xls |
| **Universal Slides (Beta)** | `slides/apps/electron` | 0.0.1 | `com.tools-universal.universal-slides` | .pptx (default), .ppt |

They are built by GitHub Actions on native runners and published as **draft
pre-releases** to
[`tools-universal/universal-office-desktop`](https://github.com/tools-universal/universal-office-desktop).
Workflow: [`.github/workflows/release-desktop.yml`](../../../.github/workflows/release-desktop.yml).
Nothing is uploaded to the Linux stores by CI: that needs the owner's store
accounts (see [Linux stores](#linux-stores)).

## Beta naming

What the user sees carries "(Beta)": window title (`<document> — Universal
Write (Beta)`), Start menu/desktop shortcut and the "Apps & features" entry
(`nsis.shortcutName` / `uninstallDisplayName`), the macOS
`CFBundleDisplayName` and dmg title, the About panel (`0.9.1 beta`), the Linux
`.desktop` `Name`, the snap title and the AppStream `<name>`. Artifact names
get `-beta`. What must stay stable for the final release to upgrade in place
does **not**: `productName` (install folder, user profile), `appId`, snap names
and Flatpak IDs. The labels come from `displayName` / `releaseChannel` in each
app's `package.json`; to leave beta, drop `releaseChannel`, the "(Beta)"
strings in `build` and the `-beta` in the `artifactName`s.

## One-time setup

Secrets on the `universal-office` repo:

- **`RELEASE_TOKEN`** — fine-grained PAT with **Contents: Read and write** on
  `tools-universal/universal-office-desktop` (or a classic PAT with `repo`).
  The default `GITHUB_TOKEN` can't publish to another repository.
- **`SUBMODULES_TOKEN`** (only if `tools-universal/office-converter` is
  private) — PAT with read access to it; the bundles import the converter from
  the `vendor/office-converter` submodule.

## Cut a release

One tag per app, matching the version in the app's `package.json` (the
workflow fails otherwise):

```bash
git tag write-v0.9.1  && git push origin write-v0.9.1
git tag sheet-v0.0.1  && git push origin sheet-v0.0.1
git tag slides-v0.0.1 && git push origin slides-v0.0.1
```

Or **Actions → Release desktop → Run workflow** (pick the app, give the tag).
For each OS the workflow installs the shared packages and the product
workspace, rebuilds the demo bundle that the app packages (`build:demo`),
runs `npm run dist` (icons, license, electron-builder) and, on Linux, also the
snap and the filled-in Flatpak manifest. Review the draft in
`universal-office-desktop` and hit **Publish** (keep "pre-release" ticked while
in beta).

## Artifacts and download URLs

`https://github.com/tools-universal/universal-office-desktop/releases/download/<app>-v<version>/<file>`
— e.g. `.../download/write-v0.9.1/Universal-Write-0.9.1-beta-Setup.exe`.
Release page: `.../releases/tag/write-v0.9.1`. The releases are pre-releases,
so `/releases/latest` does **not** point at them: link the tag.

| OS | Format | File (`<App>` = `Universal-Write`, `Universal-Sheet`, `Universal-Slides`) |
| --- | --- | --- |
| Windows x64 | NSIS installer | `<App>-<version>-beta-Setup.exe` |
| macOS | dmg | `<App>-<version>-beta-arm64.dmg`, `<App>-<version>-beta-x64.dmg` |
| Linux | AppImage | `<App>-<version>-beta-x86_64.AppImage`, `-arm64.AppImage` |
| Linux | Debian/Ubuntu | `<App>-<version>-beta-amd64.deb`, `-arm64.deb` |
| Linux | Fedora/openSUSE | `<App>-<version>-beta-x86_64.rpm`, `-aarch64.rpm` |
| Linux | tarball (Flatpak source) | `<App>-<version>-beta-x64.tar.gz`, `-arm64.tar.gz` |
| Linux | Snap Store upload | `universal-write_<version>_amd64.snap` (`universal-sheet_…`, `universal-slides_…`) |
| Linux | Flathub submission | `io.github.tools_universal.<UniversalWrite\|UniversalSheet\|UniversalSlides>.yml` (+ `.metainfo.xml`, `.desktop`) |

The `.blockmap` files are for a future auto-updater (none yet).

## Linux stores

All three apps use the same IDs per store: snap names `universal-write`,
`universal-sheet`, `universal-slides`; Flathub IDs
`io.github.tools_universal.UniversalWrite` / `UniversalSheet` /
`UniversalSlides` (reverse DNS of `github.com/tools-universal`; the hyphen
becomes `_`). Store IDs never carry "beta".

### Snap Store

1. Create an Ubuntu One account at <https://snapcraft.io> and register each
   name: `snapcraft register universal-write` (and `-sheet`, `-slides`).
   Availability could not be checked offline.
2. Upload the `.snap` from the release:
   `snapcraft upload --release=beta universal-write_0.9.1_amd64.snap`
   (use the `beta` channel while the apps are beta; `edge` for test builds).
3. To let CI upload later: `snapcraft export-login --snaps=universal-write,universal-sheet,universal-slides --channels=beta,edge creds.txt`
   and store the content as the secret `SNAPCRAFT_STORE_CREDENTIALS`, then add
   an upload step (`snapcore/action-publish`) to the workflow.

The snaps are `strict`, `base: core20`, built from electron-builder's snap
template (default plugs: desktop, home, x11, wayland, network, opengl, audio…).
`removable-media` is not declared: adding `"plugs": ["default", "removable-media"]`
to `build.snap` makes electron-builder need `snapcraft` on the runner
(`sudo snap install snapcraft --classic`). Only amd64 snaps are built (arm64
needs an arm64 runner or `snapcraft remote-build`).

### Flathub

Flathub builds from a manifest in its own GitHub repo, here repackaging the
release tar.gz on `org.electronjs.Electron2.BaseApp` 24.08 (zypak sandbox).
The manifest, AppStream metainfo and `.desktop` live in each app's `flatpak/`
folder; the tar.gz carries the metainfo, the `.desktop` and a 512 px icon in
`share/flatpak/` (electron-builder `extraFiles`), and the release has a copy
of the manifest with version, tag and sha256 filled in.

1. Publish the screenshots referenced by the metainfo
   (`https://raw.githubusercontent.com/tools-universal/universal-office-desktop/main/screenshots/universal-write.png`,
   `universal-sheet.png`, `universal-slides.png`) — Flathub requires them.
2. Fork <https://github.com/flathub/flathub>, branch from `new-pr`, add the
   filled-in `<id>.yml` and open a PR titled "Add <id>". Run
   `flatpak run --command=flathub-build org.flatpak.Builder --install <id>.yml`
   and `flatpak-builder-lint` locally first.
3. App-ID ownership: for `io.github.tools_universal.*` Flathub verifies that
   you control the GitHub org `tools-universal` (verification in the Flathub
   developer portal after the app is accepted). If you prefer an own domain
   (e.g. `com.tools-universal…` would need `tools-universal.com`), rename the
   files and the IDs before submitting — the ID can't change later.
4. Flathub reviewers ask for stable software: while in beta they may route the
   app to the `flathub-beta` repo (PR against the `beta` branch).
5. Finish-args: wayland + fallback-x11, dri, ipc, `--filesystem=home`,
   `/media`, `/run/media` (an editor that saves back to the opened file).
   The host fonts are at `/run/host/fonts` inside the sandbox, which
   `shared/fonts/node/system-fonts.cjs` does not scan yet; the bundled open
   fonts still work.

### AppImageHub

Open a PR at <https://github.com/AppImage/appimage.github.io> adding
`data/Universal_Write` (and `_Sheet`, `_Slides`) with one line: the URL of
the GitHub releases page
(`https://github.com/tools-universal/universal-office-desktop/releases`).
Their CI downloads the newest AppImage and checks its `.desktop`/AppStream.
Since the three apps share one releases repo, check that their bot picks the
right file per entry (it matches by name); separate repos per app avoid that.

## Building locally

```bash
npm install --prefix write                       # (or sheet / slides)
npm --prefix write/packages/editor run build:demo # sheet/packages/sheet, slides/packages/slides
npm --prefix write/apps/electron run dist         # installers for the current OS
npm --prefix write/apps/electron run smoke:packaged   # starts the built app with a sample file
```

- `smoke:packaged` (`build/smoke-packaged.mjs`, `--app write|sheet|slides`)
  runs the packaged executable with a sample on the command line, connects
  over the DevTools protocol, checks that the file arrived and opened, that the
  open fonts are served from `resources` and — Write — that pt-BR and en-US
  spell checking flags errors offline; it saves a PNG of the window. Options:
  `--exe` (e.g. an AppImage with `--extra "--appimage-extract-and-run --no-sandbox"`,
  or `opt/<App>/universal-write` from an extracted .deb), `--file`, `--out`.
- `smoke` (Write only) tests the shell itself in dev mode (single instance,
  MOTW, native save, print isolation, navigation guards).
- On Linux, the rpm target needs `rpmbuild` (`apt install rpm`).

## Notes

- **Electron version**: `build.electronVersion` (42.5.2) is pinned in the
  three `package.json`s — in the workspaces the `electron` module is hoisted to
  the product's `node_modules`, where electron-builder doesn't look. Bump the
  three together.
- **`npmRebuild: false`**: the apps have no runtime dependencies (the renderer
  is the prebuilt demo bundle, copied with `extraResources`). With the default
  `true`, electron-builder runs a production install on the workspace root and
  **prunes the devDependencies** of the whole product (electron-builder itself
  included).
- **Packaged assets**: `resources/packages/<product>/demo` (bundle, chunks,
  open fonts from the demo and from `shared/fonts/files`),
  `resources/system-fonts.cjs`, `resources/LICENSE.txt`. Proprietary fonts
  (Aptos, Calibri, Arial…) are never packaged; the shells read the installed
  ones at run time, and Sheet/Slides fall back to Liberation Sans for the
  font files their demos reference by name.
- **Unsigned** builds: Windows shows SmartScreen ("Windows protected your
  PC" → More info → Run anyway), macOS Gatekeeper (right-click → Open, or
  `xattr -dr com.apple.quarantine`). To sign, add the certificates as secrets
  and configure `win.certificateFile` / macOS notarization in `build`.
- **Linux sandbox**: the .deb installs `chrome-sandbox` setuid. Ubuntu 24.04
  restricts unprivileged user namespaces (AppArmor), so an AppImage may need
  `--no-sandbox`; Ubuntu 22.04+ also needs `libfuse2` to mount AppImages
  (or `--appimage-extract-and-run`).
- **Theme**: the windows open in the OS theme (`nativeTheme`, no white flash)
  and follow it until the page reports its own theme (Write and Sheet: auto
  by default; Slides: auto → light → dark toggle).
- Icons are generated at build time from `build/icon.svg` by
  `build/gen-icon.mjs` (1024 px PNG, 512 px for Flathub, file-type icons).
  The NSIS license page is the root `LICENSE` (MIT), copied to
  `build/mit-license.txt` — not `license.txt`, which the AppImage/dmg targets
  would show as an EULA.
