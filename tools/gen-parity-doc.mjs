// Fixtures de paridade do conversor .doc → .docx (dotnet/src/OfficeNext.DocBinary):
// roda o conversor JS (write/packages/docx-core, dist já compilado) sobre as
// fixtures sintéticas write/packages/docx-core/test/fixtures/doc/*.doc e grava,
// parte a parte, o conteúdo EXATO de cada parte do .docx gerado em
//   dotnet/tests/fixtures/expected/doc/<fixture>/<caminho da parte>
// + _parts.txt (ordem das partes no ZIP). O teste .NET (DocBinaryParityTests)
// converte o mesmo .doc e compara parte a parte (texto XML byte a byte).
//
// Uso: (cd write/packages/docx-core && npx tsc -p .) && node tools/gen-parity-doc.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixturesIn = join(root, 'write', 'packages', 'docx-core', 'test', 'fixtures', 'doc');
const outDir = join(root, 'dotnet', 'tests', 'fixtures', 'expected', 'doc');

const { convertDocToDocx } = await import(new URL('../write/packages/docx-core/dist/index.js', import.meta.url).href);
const { unzipSync } = await import(new URL('../write/node_modules/fflate/esm/index.mjs', import.meta.url).href);

rmSync(outDir, { recursive: true, force: true });
const names = readdirSync(fixturesIn).filter((f) => f.endsWith('.doc')).sort();
for (const file of names) {
  const name = file.replace(/\.doc$/, '');
  const docx = convertDocToDocx(new Uint8Array(readFileSync(join(fixturesIn, file))));
  const parts = unzipSync(docx);
  const dir = join(outDir, name);
  const order = Object.keys(parts);
  for (const p of order) {
    const target = join(dir, ...p.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, parts[p]);
  }
  writeFileSync(join(dir, '_parts.txt'), order.join('\n') + '\n', 'utf8');
  console.log(`expected/doc/${name}: ${order.length} partes`);
}
