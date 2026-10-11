// Executa um script PowerShell do lab que dirige o Word por COM sobre uma lista
// de documentos ("id|caminho" por linha), com vigia: sem saída por `timeout`
// ms, encerra o PowerShell (nunca o Word — a instância pode ser compartilhada
// com outra automação) e retoma do documento seguinte. Processos sem janela.
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {object} o
 * @param {string} o.script    caminho do .ps1
 * @param {{id: string, path: string}[]} o.items
 * @param {string[]} [o.args]  argumentos extras do .ps1 (além de -List)
 * @param {string} o.workDir   pasta para a lista temporária e o log
 * @param {number} [o.timeout] ms sem progresso antes de encerrar o PowerShell
 * @param {(line: string) => void} [o.onLine]
 * @returns {Promise<Map<string, string>>} id → linha de resultado ("OK ..."/"ERR ..."/"TIMEOUT")
 */
export async function runWordBatch(o) {
  const results = new Map();
  const timeout = o.timeout ?? 180_000;
  const log = join(o.workDir, 'word-batch.log');
  let pending = [...o.items];
  while (pending.length) {
    const list = join(o.workDir, 'word-batch-list.txt');
    writeFileSync(list, '﻿' + pending.map((d) => `${d.id}|${d.path}`).join('\r\n'), 'utf8');
    const done = await new Promise((resolve) => {
      const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', o.script, '-List', list, ...(o.args ?? [])], { windowsHide: true });
      const seen = new Set();
      let aborted = false;
      let timer;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          // nunca matar o Word: a instância pode ser compartilhada com outra automação
          appendFileSync(log, `vigia: sem progresso em ${timeout / 1000}s — encerrando o PowerShell\n`);
          ps.kill();
        }, timeout);
      };
      arm();
      let buf = '';
      ps.stdout.on('data', (chunk) => {
        buf += chunk.toString('utf8');
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          arm();
          appendFileSync(log, line + '\n');
          if (line.startsWith('ABORT')) aborted = true;
          const m = /^(OK|ERR) (\S+)/.exec(line);
          if (m) { seen.add(m[2]); results.set(m[2], line); o.onLine?.(line); }
        }
      });
      ps.stderr.on('data', (c) => appendFileSync(log, 'STDERR ' + c.toString('utf8')));
      ps.on('close', () => { clearTimeout(timer); resolve({ seen, aborted }); });
    });
    if (done.aborted) throw new Error('abortado: a instância do Word não era nova (outra automação em uso?)');
    const rest = pending.filter((d) => !done.seen.has(d.id));
    if (rest.length && rest.length === pending.length - done.seen.size) {
      // o lote parou: o primeiro não concluído travou o Word
      const bad = rest[0];
      results.set(bad.id, 'TIMEOUT');
      o.onLine?.(`TIMEOUT ${bad.id}`);
      pending = rest.slice(1);
    } else {
      pending = rest;
    }
  }
  return results;
}
