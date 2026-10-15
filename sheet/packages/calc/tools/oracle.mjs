// Gera a resposta do Excel para um banco de casos do motor de cálculo:
//   node tools/oracle.mjs <área>   (lê test/oracle/<área>.cases.json → grava <área>.excel.json)
// Requer `npx tsc -p tsconfig.json` antes (usa dist/testing.js) e o Excel
// instalado (COM, sem janela; mata só a instância que abriu).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toOracleInput } from '../dist/testing.js';

const here = dirname(fileURLToPath(import.meta.url));
const area = process.argv[2];
if (!area) { console.error('uso: node tools/oracle.mjs <área>'); process.exit(2); }
const casesPath = join(here, '..', 'test', 'oracle', `${area}.cases.json`);
const cases = JSON.parse(readFileSync(casesPath, 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'xlcalc-'));
const input = join(tmp, 'in.json'), output = join(tmp, 'out.json');
writeFileSync(input, JSON.stringify(toOracleInput(cases)));
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(here, 'xl-calc.ps1'), '-In', input, '-Out', output],
  { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true, timeout: 30 * 60 * 1000 });
const out = JSON.parse(readFileSync(output, 'utf8').replace(/^﻿/, ''));
const res = (Array.isArray(out) ? out : [out]).map(({ id, v, spill, text, local, err }) => ({ id, v: v ?? null, ...(spill ? { spill } : {}), text, local, ...(err ? { err } : {}) }));
writeFileSync(join(here, '..', 'test', 'oracle', `${area}.excel.json`), JSON.stringify(res, null, 1) + '\n');
console.log(`${res.length} casos → test/oracle/${area}.excel.json`);
