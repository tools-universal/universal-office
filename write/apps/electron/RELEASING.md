# Releasing the desktop app

The **Universal Write** desktop app (this folder) is built and published to
[`tools-universal/universal-office-desktop`](https://github.com/tools-universal/universal-office-desktop)
by GitHub Actions — one build per OS on native runners.

Workflow: [`.github/workflows/release-desktop.yml`](../../../.github/workflows/release-desktop.yml)
(at the monorepo root).

## One-time setup

Create a repository (or org) secret named **`RELEASE_TOKEN`** on the
`universal-office` repo:

- **Fine-grained PAT** with **Contents: Read and write** on
  `tools-universal/universal-office-desktop`, **or**
- **Classic PAT** with the `repo` scope.

The default `GITHUB_TOKEN` can't publish to a different repository, hence the
dedicated token for the cross-repo release.

## Cut a release

```bash
# from the monorepo (universal-office) root
git tag v0.1.0
git push origin v0.1.0
```

The workflow then:

1. Builds on `windows-latest`, `macos-latest`, and `ubuntu-latest`.
2. Runs `npm install`, builds the editor bundle (`build:demo`), rasterizes the
   app icon (`build:icon`), and packages with `electron-builder` (`dist`).
3. Publishes a **draft** release to `universal-office-desktop` with the
   installers attached — review and hit **Publish** there.

You can also trigger it manually from **Actions → Release desktop → Run
workflow** (provide the tag).

## Artifacts

| OS | File |
| --- | --- |
| Windows | `Universal-Write-<version>-Setup.exe` (NSIS installer) |
| macOS | `Universal-Write-<version>-<arch>.dmg` |
| Linux | `Universal-Write-<version>-<arch>.AppImage` |

## Notes

- **Unsigned** builds: macOS shows a Gatekeeper prompt and Windows a SmartScreen
  warning. To sign, add certificates as secrets and configure
  `win.certificateFile` / macOS notarization in `package.json` → `build`.
- The app icon is generated at build time from
  [`build/icon.svg`](build/icon.svg) (→ 1024px PNG → per-platform icons).
- Packaged assets (editor bundle + fonts) are copied via `extraResources`; the
  app serves them from `process.resourcesPath` (see `main.cjs`).
