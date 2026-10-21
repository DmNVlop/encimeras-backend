/**
 * Lanzador de las pruebas de API contra UNA fábrica (backend en marcha).
 * La fábrica es OBLIGATORIA (factory=<Fábrica>), sin valor por defecto.
 *
 *   npm run test:demo                              → lista los grupos
 *   npm run test:demo -- users factory=DEMO        → un grupo
 *   npm run test:demo -- users auth factory=DEMO   → varios
 *   npm run test:demo -- all factory=DEMO          → todos
 *
 * Grupo = carpeta de test/demo/. Se ejecutan los `*.test.js` de cada grupo, en
 * orden y de uno en uno. Los archivos que empiezan por `_` son utilidades.
 * Un test falla si sale con código ≠ 0 o si imprime una línea FALLO/ABORTO.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const groups = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name)
  .sort();

const testsOf = (group) =>
  fs
    .readdirSync(path.join(ROOT, group))
    .filter((f) => f.endsWith('.test.js') && !f.startsWith('_'))
    .sort()
    .map((f) => path.join(group, f));

// factory=DEMO (o --factory=DEMO). Sin guiones porque PowerShell se come el `--` de
// `npm run test:demo -- …` y npm se queda con `--factory` (lo deja en npm_config_factory).
const isFactoryArg = (a) => /^(--)?factory=/.test(a);
const factoryArg = process.argv.slice(2).find(isFactoryArg);
const FACTORY = factoryArg ? factoryArg.split('=')[1] : process.env.npm_config_factory;
const args = process.argv.slice(2).filter((a) => !isFactoryArg(a));
const USAGE = 'Uso: npm run test:demo -- <grupo> [grupo…] | all  factory=<Fábrica>   (p. ej. factory=DEMO)';
if (!args.length) {
  console.log('Grupos disponibles:');
  for (const g of groups) console.log(`  ${g.padEnd(20)} ${testsOf(g).map((t) => path.basename(t)).join(', ')}`);
  console.log('\n' + USAGE);
  process.exit(0);
}
if (!FACTORY) {
  console.log(`ABORTO: falta la fábrica. No se ejecuta nada sin elegirla.\n${USAGE}`);
  process.exit(1);
}
process.env.TEST_FACTORY = FACTORY;

const selected = args.includes('all') ? groups : args;
const unknown = selected.filter((g) => !groups.includes(g));
if (unknown.length) {
  console.log(`Grupo desconocido: ${unknown.join(', ')}. Disponibles: ${groups.join(', ')}`);
  process.exit(1);
}

(async () => {
  // Seguro duro antes de tocar nada: el ADMIN del .env es de FACTORY_ID de la fábrica elegida (aborta si no).
  let lib, admin, factoryId;
  try {
    lib = require('./_lib/env');
    admin = await lib.loginAs('ADMIN');
    factoryId = await lib.assertFactory(admin);
  } catch (e) {
    console.log(e.message.startsWith('ABORTO') ? e.message : `ABORTO: ${e.message}`);
    process.exit(1);
  }
  console.log(`Fábrica de las pruebas: ${FACTORY} (${factoryId}), comprobada con el token.`);
  const childEnv = { ...process.env, TEST_FACTORY: FACTORY, DEMO_BEARER_TOKEN: admin.Authorization.replace(/^Bearer\s+/, '') };

  const results = [];
  for (const group of selected) {
    for (const test of testsOf(group)) {
      console.log(`\n━━ ${test} ━━`);
      const started = Date.now();
      const run = spawnSync(process.execPath, [path.join(ROOT, test)], { encoding: 'utf8', env: childEnv });
      const output = `${run.stdout || ''}${run.stderr || ''}`;
      process.stdout.write(output);
      const failed = run.status !== 0 || /^(FALLO|ABORTO)/m.test(output);
      results.push({ test, ok: !failed, secs: ((Date.now() - started) / 1000).toFixed(1) });
    }
  }

  console.log('\n━━ Resumen ━━');
  for (const r of results) console.log(`${r.ok ? 'OK   ' : 'FALLO'} ${r.test} (${r.secs} s)`);
  const failedCount = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failedCount}/${results.length} tests OK`);
  process.exit(failedCount ? 1 : 0);
})();
