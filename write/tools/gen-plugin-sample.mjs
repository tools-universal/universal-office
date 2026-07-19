import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_RUN_PROPS,
  DocxPackage,
  writeDocument,
} from '../packages/docx-core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'tools', 'word-lab', 'results', 'plugin-mention', 'plugin-mention.docx');
const props = { ...DEFAULT_RUN_PROPS, szHalfPt: 22 };
const model = {
  paragraphs: [{
    props: {},
    runs: [
      { text: 'Olá, ', props },
      {
        text: '\uFFFC',
        props,
        custom: {
          type: 'mention',
          data: { id: 'ada-lovelace', label: 'Ada Lovelace' },
          fallbackText: '@Ada Lovelace',
        },
      },
      { text: '! Este inline foi criado por um plugin do <universal-write>.', props },
    ],
  }],
  sectPr: {
    pageWidthTwips: 11906,
    pageHeightTwips: 16838,
    marginLeftTwips: 1701,
    marginRightTwips: 1701,
    marginTopTwips: 1417,
    marginBottomTwips: 1417,
  },
};

const pkg = DocxPackage.empty();
writeDocument(pkg, model);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, pkg.save());
console.log(output);
