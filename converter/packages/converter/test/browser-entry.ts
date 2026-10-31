import { convert, detectFormat } from '../src/index.js';

Object.assign(globalThis, { officeConverter: { convert, detectFormat } });
