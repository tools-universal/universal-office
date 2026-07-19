// Fábricas de modelo para os testes do diff — constroem blocos do docx-core
// diretamente (sem I/O), espelhando as formas que readFullDocument produz.
import type {
  Block,
  InlineImage,
  Paragraph,
  ParagraphBlock,
  ParaProps,
  Run,
  RunProps,
  TableBlock,
  TableCell,
} from '@universal-office/docx-core';
import { DEFAULT_RUN_PROPS } from '@universal-office/docx-core';

export const runProps = (over: Partial<RunProps> = {}): RunProps => ({
  ...DEFAULT_RUN_PROPS,
  ...over,
});

export const run = (text: string, over: Partial<RunProps> = {}): Run => ({
  text,
  props: runProps(over),
});

export const imageRun = (
  data: Uint8Array,
  over: Partial<InlineImage> = {},
): Run => ({
  text: '￼',
  props: runProps(),
  image: {
    data,
    ext: 'png',
    widthTwips: 2880,
    heightTwips: 1440,
    ...over,
  },
});

export const para = (
  runsOrText: Run[] | string,
  props: ParaProps = {},
): ParagraphBlock => ({
  type: 'paragraph',
  paragraph: {
    runs: typeof runsOrText === 'string' ? [run(runsOrText)] : runsOrText,
    props,
  } satisfies Paragraph,
});

export const cell = (texts: string[], over: Partial<TableCell> = {}): TableCell => ({
  paragraphs: texts.map((t) => para(t).paragraph),
  tables: [],
  gridSpan: 1,
  ...over,
});

export const table = (rows: string[][], over: Partial<TableBlock> = {}): TableBlock => ({
  type: 'table',
  rows: rows.map((cells) => ({ cells: cells.map((t) => cell([t])) })),
  gridColsTwips: rows[0]?.map(() => 2400) ?? [],
  ...over,
});

export const doc = (...blocks: Block[]): Block[] => blocks;

export const bytes = (...vals: number[]): Uint8Array => new Uint8Array(vals);
