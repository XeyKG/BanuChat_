import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const packages = ['backend/api', 'backend/rag', 'backend/mcp-server', 'mobile'];
const rows = [];
let failed = false;

function run(command, cwd) {
  console.log(`\n[${cwd}] ${command}`);
  return new Promise(resolve => {
    const child = spawn(command, {
      cwd: fileURLToPath(new URL(`${cwd}/`, root)),
      shell: true, // Fixed commands only; supports npm.cmd on Windows and npm on Linux.
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { process.stderr.write(chunk); });
    child.on('error', error => {
      console.error(error.message);
      resolve({ ok: false, output });
    });
    child.on('close', code => resolve({ ok: code === 0, output }));
  });
}

// Install all packages first: API's stdio fixture uses MCP dependencies,
// and MCP typechecks imports from API. No services or .env files are loaded here.
const installed = new Map();
for (const pkg of packages) {
  const result = await run('npm ci', pkg);
  installed.set(pkg, result.ok);
  failed ||= !result.ok;
}

for (const pkg of packages) {
  if (!installed.get(pkg)) {
    rows.push({ paquete: pkg, tests: 'NO EJECUTADO', pass: '-', fail: '-', typecheck: 'npm ci FALLÓ' });
    continue;
  }
  const typecheck = await run('npx --no-install tsc --noEmit', pkg);
  const test = await run('npm test', pkg);
  const counts = {};
  // Node 22 uses TAP in pipes; newer Node versions may use the spec reporter.
  for (const match of test.output.matchAll(/^(?:#|ℹ) (tests|pass|fail|cancelled|skipped|todo) (\d+)\s*$/gm)) {
    counts[match[1]] = Number(match[2]);
  }
  const complete = ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
    .every(key => Number.isInteger(counts[key]));
  const testsOk = test.ok && complete && counts.tests > 0 && counts.fail === 0
    && counts.cancelled === 0 && counts.skipped === 0 && counts.todo === 0
    && counts.pass === counts.tests;
  failed ||= !typecheck.ok || !testsOk;
  if (!testsOk) console.error(`[${pkg}] Pruebas fallidas o resumen incompleto; revisar salida anterior.`);
  rows.push({ paquete: pkg, tests: counts.tests ?? '?', pass: counts.pass ?? '?',
    fail: counts.fail ?? '?', typecheck: typecheck.ok ? 'PASS' : 'FAIL' });
}

console.table(rows);
process.exitCode = failed ? 1 : 0;
