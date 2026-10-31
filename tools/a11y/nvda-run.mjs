// Teste com o NVDA de verdade nos dois viewers: o que o leitor de tela FALA.
//  - NVDA portátil com configuração TEMPORÁRIA (sintetizador mudo, sem sons,
//    não grava configuração) e log no nível IO, que registra cada fala;
//  - Chromium com janela (Playwright), em primeiro plano;
//  - teclas pelo Windows (SendKeys): o NVDA só ouve teclado de verdade — por
//    isso o teste OCUPA o computador enquanto roda (não usar teclado/mouse).
// Uso: node tools/a11y/nvda-run.mjs [D:\NVDA\nvda.exe]
// Requer as demos servidas (slides/ em :8097, write/ em :8099).
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(path.join(ROOT, 'slides', 'package.json'))('playwright');
const NVDA = process.argv[2] ?? 'D:\\NVDA\\nvda.exe';
const OUT = path.join(ROOT, 'tools', 'a11y', 'nvda-transcript.md');

const work = mkdtempSync(path.join(tmpdir(), 'nvda-'));
const cfg = path.join(work, 'config');
mkdirSync(cfg);
writeFileSync(path.join(cfg, 'nvda.ini'), [
  'schemaVersion = 18',
  '[general]', '\tshowWelcomeDialogAtStartup = False', '\tlanguage = pt_BR', '\tsaveConfigurationOnExit = False',
  '\taskToExit = False', '\tplayStartAndExitSounds = False',
  '[update]', '\tautoCheck = False', '\tstartupNotification = False', '\taskedAllowUsageStats = True', '\tallowUsageStats = False',
  '[speech]', '\tsynth = silence',
  '[virtualBuffers]', '\tautoSayAllOnPageLoad = False',
  '',
].join('\r\n'));
const LOG = path.join(work, 'nvda.log');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ps = (cmd) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true });
/** Janela que PODE receber teclas: só o Chromium do teste. */
const TEST_WINDOW = 'Chrome for Testing';
const FG = `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; using System.Text; public class FG { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n); public static string Title() { var b = new StringBuilder(512); GetWindowText(GetForegroundWindow(), b, 512); return b.ToString(); } }';`;
/** Título da janela em primeiro plano. */
const foreground = () => ps(`${FG} [FG]::Title()`).toString('utf8').trim();
/**
 * Teclas pelo Windows (sintaxe do SendKeys: {TAB}, {ENTER}, ^{HOME}, h…) — SÓ se
 * a janela em primeiro plano for a do teste (a checagem e o envio no mesmo
 * processo); senão não envia nada e o passo fica marcado.
 */
const keys = (seq) => {
  const out = ps(`${FG} Add-Type -AssemblyName System.Windows.Forms; $t = [FG]::Title(); if ($t -like '*${TEST_WINDOW}*') { [System.Windows.Forms.SendKeys]::SendWait('${seq.replace(/'/g, "''")}'); 'ok' } else { 'skip:' + $t }`).toString('utf8').trim();
  if (out !== 'ok') { skipped++; console.log(`  ✋ tecla ${seq} NÃO enviada — janela em primeiro plano: ${out.slice(5)}`); }
};
let skipped = 0;
/** Traz o Chromium do teste para a frente; true se conseguiu. */
const activate = async () => {
  for (let i = 0; i < 5; i++) {
    try { ps(`$null = (New-Object -ComObject WScript.Shell).AppActivate('${TEST_WINDOW}')`); } catch { /* tenta de novo */ }
    await sleep(400);
    if (foreground().includes(TEST_WINDOW)) return true;
  }
  return false;
};

/** Falas registradas no log desde a posição `from`. */
const spoken = (from) => {
  if (!existsSync(LOG)) return { text: [], end: from };
  const all = readFileSync(LOG, 'utf8');
  const chunk = all.slice(from);
  const text = [];
  for (const m of chunk.matchAll(/Speaking \[(.*)\]\s*$/gm)) {
    // a sequência vem como repr de lista Python: pega só os textos entre aspas
    const parts = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map((x) => (x[1] ?? x[2] ?? '').replace(/\\'/g, "'"));
    const t = parts.filter((p) => p.trim()).join(' ');
    if (t) text.push(t);
  }
  return { text, end: all.length };
};

const transcript = [`# NVDA — transcrição (${new Date().toISOString()})`, '', 'Sintetizador mudo; o texto abaixo é o que o NVDA falaria (log nível IO).', ''];
let pos = 0;
const step = async (label, act, wait = 900) => {
  await act();
  await sleep(wait);
  const r = spoken(pos);
  pos = r.end;
  transcript.push(`- **${label}** → ${r.text.length ? r.text.map((t) => `«${t}»`).join(' · ') : '_(silêncio)_'}`);
  console.log(`${label}: ${r.text.join(' | ')}`);
};

const nvda = spawn(NVDA, ['-r', '-m', '--disable-addons', '-c', cfg, '-f', LOG, '-l', '12'], { detached: true, stdio: 'ignore' });
nvda.unref();
let browser;
try {
  await sleep(7000);
  browser = await chromium.launch({ headless: false, args: ['--force-renderer-accessibility', '--start-maximized'] });
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();

  const ready = async (label) => {
    await page.bringToFront();
    if (!(await activate())) throw new Error(`${label}: não consegui trazer o Chromium do teste para a frente — nenhuma tecla enviada`);
    await sleep(1500);
    pos = spoken(0).end;
  };

  // ── documento ──
  transcript.push('', '## universal-document-viewer', '');
  await page.goto('http://localhost:8099/packages/viewer/demo/');
  await page.evaluate(() => new Promise((r) => { document.getElementById('dv').addEventListener('udv-loaded', () => setTimeout(r, 800), { once: true }); setTimeout(r, 8000); }));
  await ready('documento');
  await step('Esc (modo de navegação)', () => keys('{ESC}'));
  await step('Ctrl+Home (início da página)', () => keys('^{HOME}'));
  for (let i = 1; i <= 8; i++) await step(`H (próximo título) #${i}`, () => keys('h'));
  await step('↓ (próxima linha)', () => keys('{DOWN}'));
  await step('↓', () => keys('{DOWN}'));
  await step('foco na área de páginas', () => page.evaluate(() => document.getElementById('dv').shadowRoot.querySelector('.udv-scroll').focus()), 1500);
  for (let i = 1; i <= 4; i++) await step(`Tab #${i}`, () => keys('{TAB}'));
  await step('Enter (Próxima página)', () => keys('{ENTER}'), 1500);

  // ── apresentação ──
  transcript.push('', '## universal-slides-viewer', '');
  await page.goto('http://localhost:8097/packages/viewer/demo/controls.html');
  await page.evaluate(() => new Promise((r) => { document.getElementById('pv').addEventListener('us-loaded', () => setTimeout(r, 800), { once: true }); setTimeout(r, 8000); }));
  await ready('apresentação');
  await step('Esc (modo de navegação)', () => keys('{ESC}'));
  await step('Ctrl+Home', () => keys('^{HOME}'));
  for (let i = 1; i <= 2; i++) await step(`H (próximo título) #${i}`, () => keys('h'));
  for (let i = 1; i <= 5; i++) await step(`↓ (lê o slide) #${i}`, () => keys('{DOWN}'));
  await step('foco no slide', () => page.evaluate(() => document.getElementById('pv').shadowRoot.querySelector('canvas').focus()), 1500);
  await step('Tab (progresso)', () => keys('{TAB}'));
  await step('→ no progresso', () => keys('{RIGHT}'), 1500);
  await step('Esc (volta à navegação)', () => keys('{ESC}'));
  await step('Ctrl+Home', () => keys('^{HOME}'));
  for (let i = 1; i <= 2; i++) await step(`H #${i} (slide novo)`, () => keys('h'));
  for (let i = 1; i <= 3; i++) await step(`↓ #${i}`, () => keys('{DOWN}'));
} finally {
  try { await browser?.close(); } catch { /* fechado */ }
  try { execFileSync(NVDA, ['-q'], { windowsHide: true, timeout: 15000 }); } catch { /* já saiu */ }
  if (skipped) transcript.push('', `⚠️ ${skipped} tecla(s) não enviada(s): janela em primeiro plano não era a do teste.`);
  writeFileSync(OUT, transcript.join('\n') + '\n');
  console.log(`\n→ ${OUT}\n  log completo: ${LOG}`);
}
