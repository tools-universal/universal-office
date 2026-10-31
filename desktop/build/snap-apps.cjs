// afterAllArtifactBuild do electron-builder: dá ao .snap os TRÊS lançadores
// (Universal Write, Sheet e Slides), além do app `universal-office`. O alvo
// snap do electron-builder só declara um app, então o .snap pronto é aberto
// (unsquashfs), ganha os apps `write`, `sheet` e `slides` no meta/snap.yaml —
// o mesmo comando do app principal com UO_APP=<editor> no ambiente (o snapd não
// aceita "=" no comando, então não dá para passar --editor=…) — e um .desktop com
// o ícone de cada um em meta/gui/, e é refeito (mksquashfs, como o snapcraft).
// Precisa do squashfs-tools (Linux); sem eles, avisa e deixa o snap como está.
const { execFileSync } = require('node:child_process');
const { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const LAUNCHERS = [
  { app: 'write', name: 'Universal Write (Beta)', generic: 'Word Processor', comment: 'Edit Word documents (.docx, .doc, .odt)', categories: 'Office;WordProcessor;',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;application/msword;application/vnd.oasis.opendocument.text;' },
  { app: 'sheet', name: 'Universal Sheet (Beta)', generic: 'Spreadsheet', comment: 'View Excel spreadsheets (.xlsx, .xlsm, .xls)', categories: 'Office;Spreadsheet;',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;application/vnd.ms-excel.sheet.macroEnabled.12;application/vnd.ms-excel;' },
  { app: 'slides', name: 'Universal Slides (Beta)', generic: 'Presentation', comment: 'View and present PowerPoint presentations (.pptx, .ppt)', categories: 'Office;Presentation;',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation;application/vnd.ms-powerpoint;' },
];

const has = (bin) => { try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; } };

exports.default = async function addSnapLaunchers(ctx) {
  const snaps = (ctx.artifactPaths || []).filter((p) => p.endsWith('.snap'));
  if (!snaps.length) return [];
  if (!has('unsquashfs') || !has('mksquashfs')) {
    console.warn('  • snap: squashfs-tools ausente — o snap fica só com o lançador "Universal Office (Beta)"');
    return [];
  }
  const yaml = require('js-yaml');
  for (const snap of snaps) {
    const work = mkdtempSync(join(tmpdir(), 'uo-snap-'));
    const root = join(work, 'root');
    try {
      execFileSync('unsquashfs', ['-q', '-d', root, snap], { stdio: 'ignore' });
      const metaFile = join(root, 'meta', 'snap.yaml');
      const meta = yaml.load(readFileSync(metaFile, 'utf8'));
      const mainName = Object.keys(meta.apps)[0];
      const main = meta.apps[mainName];
      for (const l of LAUNCHERS) {
        meta.apps[l.app] = { ...main, environment: { ...(main.environment || {}), UO_APP: l.app } };
        copyFileSync(join(__dirname, 'editor-icons', `${l.app}.png`), join(root, 'meta', 'gui', `${l.app}.png`));
        writeFileSync(join(root, 'meta', 'gui', `${l.app}.desktop`), [
          '[Desktop Entry]', 'Type=Application', `Name=${l.name}`, `GenericName=${l.generic}`, `Comment=${l.comment}`,
          `Exec=${meta.name}.${l.app} %U`, `Icon=\${SNAP}/meta/gui/${l.app}.png`, 'Terminal=false', `Categories=${l.categories}`,
          `MimeType=${l.mime}`, 'StartupWMClass=Universal Office', '',
        ].join('\n'));
      }
      writeFileSync(metaFile, yaml.dump(meta, { lineWidth: -1 }));
      rmSync(snap, { force: true });
      execFileSync('mksquashfs', [root, snap, '-noappend', '-comp', 'xz', '-no-xattrs', '-no-fragments', '-all-root', '-quiet'], { stdio: 'ignore' });
      console.log(`  • snap: apps ${[mainName, ...LAUNCHERS.map((l) => l.app)].join(', ')} — ${snap}`);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
  return [];
};
