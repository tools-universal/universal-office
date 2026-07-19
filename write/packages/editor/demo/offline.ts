import '../src/universal-write.js';
import { createMentionPlugin } from '../src/mention-plugin.js';
import type { UniversalWriteElement } from '../src/universal-write.js';
import type { UniversalWriteFontAsset } from '../src/plugins.js';

import aptosRegular from '../../../tools/word-lab/fonts/aptos-regular.ttf';
import aptosBold from '../../../tools/word-lab/fonts/aptos-bold.ttf';
import aptosItalic from '../../../tools/word-lab/fonts/aptos-italic.ttf';
import aptosBoldItalic from '../../../tools/word-lab/fonts/aptos-bolditalic.ttf';
import calibriRegular from '../../../tools/word-lab/fonts/calibri.ttf';
import calibriBold from '../../../tools/word-lab/fonts/calibrib.ttf';
import calibriItalic from '../../../tools/word-lab/fonts/calibrii.ttf';
import calibriBoldItalic from '../../../tools/word-lab/fonts/calibriz.ttf';

import aptosRegularAdvances from '../../../tools/word-lab/fonts/aptos-advances.json';
import aptosBoldAdvances from '../../../tools/word-lab/fonts/aptos-bold-advances.json';
import aptosItalicAdvances from '../../../tools/word-lab/fonts/aptos-italic-advances.json';
import aptosBoldItalicAdvances from '../../../tools/word-lab/fonts/aptos-bolditalic-advances.json';
import calibriRegularAdvances from '../../../tools/word-lab/fonts/calibri-advances.json';
import calibriBoldAdvances from '../../../tools/word-lab/fonts/calibri-bold-advances.json';
import calibriItalicAdvances from '../../../tools/word-lab/fonts/calibri-italic-advances.json';
import calibriBoldItalicAdvances from '../../../tools/word-lab/fonts/calibri-bolditalic-advances.json';

const assets: UniversalWriteFontAsset[] = [
  { family: 'Aptos', variant: 'regular', data: aptosRegular, advances: aptosRegularAdvances },
  { family: 'Aptos', variant: 'bold', data: aptosBold, advances: aptosBoldAdvances },
  { family: 'Aptos', variant: 'italic', data: aptosItalic, advances: aptosItalicAdvances },
  { family: 'Aptos', variant: 'boldItalic', data: aptosBoldItalic, advances: aptosBoldItalicAdvances },
  { family: 'Calibri', variant: 'regular', data: calibriRegular, advances: calibriRegularAdvances },
  { family: 'Calibri', variant: 'bold', data: calibriBold, advances: calibriBoldAdvances },
  { family: 'Calibri', variant: 'italic', data: calibriItalic, advances: calibriItalicAdvances },
  { family: 'Calibri', variant: 'boldItalic', data: calibriBoldItalic, advances: calibriBoldItalicAdvances },
];

// Smoke test explícito: qualquer acesso de rede em runtime derruba o demo.
globalThis.fetch = async () => { throw new Error('offline demo: fetch proibido'); };

const editor = document.querySelector('universal-write') as UniversalWriteElement;
const people = [
  { id: 'ada-lovelace', label: 'Ada Lovelace' },
  { id: 'grace-hopper', label: 'Grace Hopper' },
  { id: 'alan-turing', label: 'Alan Turing' },
  { id: 'margaret-hamilton', label: 'Margaret Hamilton' },
  { id: 'linus-torvalds', label: 'Linus Torvalds' },
] as const;

editor.use(createMentionPlugin({
  source: (query) => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return people.filter((person) => person.label.toLocaleLowerCase('pt-BR').includes(normalized));
  },
}));
await editor.initialize({ fonts: assets });
editor.focusEditor();
document.documentElement.dataset.offlineReady = 'true';
document.getElementById('status')!.textContent = 'Clique na página e digite @ para escolher uma menção';
