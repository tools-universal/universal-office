#!/usr/bin/env node
/**
 * check-universal — garante POR CONSTRUÇÃO que todos os pacotes de export
 * rodam em browser e node (spec 06):
 *
 *   1. esbuild --bundle --platform=browser sobre o src/index.ts de cada
 *      pacote (aliases dos irmãos para src, como os build:demo). Se algo
 *      importar fs/path/os/child_process, o bundle FALHA — é a verificação
 *      mais forte e barata.
 *   2. Varre o bundle gerado por padrões proibidos NÃO guardados:
 *      require("fs"|"path"|...), `from "node:..."`, process.env, __dirname.
 *      Feature-detect via `typeof`/`globalThis` é permitido.
 *
 * Os bundles aprovados são gravados em tools/dist-universal/ e reusados
 * pelo browser-smoke.mjs. Sai com código != 0 em qualquer violação.
 */
import { PACKAGES, buildBrowserBundle } from './universal-packages.mjs';

/** Padrões proibidos no bundle browser (aplicados linha a linha). */
const BANNED = [
  { re: /require\(\s*["'](?:node:)?(?:fs|path|os|child_process|crypto|zlib|util|stream|worker_threads)\b/g, label: 'require de builtin node' },
  { re: /from\s*["']node:/g, label: 'import de "node:*"' },
  { re: /\bprocess\.env\b/g, label: 'process.env' },
  { re: /\b__dirname\b/g, label: '__dirname' },
];

/** A linha usa feature-detect (typeof/globalThis) → uso guardado, permitido. */
function isGuarded(line) {
  return /typeof\s+(?:process|__dirname|require)\b/.test(line) || /globalThis\s*[.[]/.test(line);
}

/** Varre o texto do bundle e devolve as violações encontradas. */
function scanBundle(text) {
  const violations = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { re, label } of BANNED) {
      re.lastIndex = 0;
      if (re.test(line) && !isGuarded(line)) {
        violations.push({ line: i + 1, label, snippet: line.trim().slice(0, 160) });
      }
    }
  }
  return violations;
}

let failed = false;
for (const pkg of PACKAGES) {
  let text;
  try {
    text = await buildBrowserBundle(pkg, { write: true });
  } catch (err) {
    failed = true;
    console.log(`FAIL  ${pkg.name} — bundle browser falhou (import de módulo node?)`);
    const msgs = err?.errors?.map((e) => `      ${e.text}${e.location ? ` (${e.location.file}:${e.location.line})` : ''}`) ?? [`      ${err.message}`];
    for (const m of msgs.slice(0, 8)) console.log(m);
    continue;
  }
  const violations = scanBundle(text);
  if (violations.length > 0) {
    failed = true;
    console.log(`FAIL  ${pkg.name} — ${violations.length} padrão(ões) proibido(s) no bundle:`);
    for (const v of violations.slice(0, 10)) {
      console.log(`      L${v.line} [${v.label}] ${v.snippet}`);
    }
  } else {
    console.log(`PASS  ${pkg.name} (bundle browser ${(text.length / 1024).toFixed(0)} KiB, sem padrões proibidos)`);
  }
}

if (failed) {
  console.log('\ncheck-universal: FALHOU — corrija as violações acima.');
  process.exit(1);
}
console.log('\ncheck-universal: OK — todos os exports compilam para browser sem padrões proibidos.');
