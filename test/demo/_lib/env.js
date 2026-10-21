const fs = require('fs');
const path = require('path');
// Fábrica de las pruebas: OBLIGATORIA (`npm run test:demo -- <grupo> factory=DEMO`), sin valor
// por defecto. Credenciales en docs/integrations/<Fábrica>/.env.playwright.local, fuera de git.
const FACTORY = process.env.TEST_FACTORY;
if (!FACTORY) throw new Error('ABORTO: falta la fábrica (factory=<Fábrica>). No se ejecuta nada sin elegirla.');
const ENV_FILE = path.join(__dirname, `../../../../docs/integrations/${FACTORY}/.env.playwright.local`);
if (!fs.existsSync(ENV_FILE)) throw new Error(`ABORTO: no existe ${ENV_FILE} (credenciales de la fábrica ${FACTORY}).`);
const env = Object.fromEntries(fs.readFileSync(ENV_FILE, 'utf8')
  .split(/\r?\n/).filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
if (!env.API_URL) throw new Error(`ABORTO: API_URL vacío en ${ENV_FILE}.`);
const API = env.API_URL.replace(/\/$/, '');
const auth = (t) => ({ Authorization: 'Bearer ' + t.replace(/^Bearer\s+/i, ''), 'Content-Type': 'application/json' });

async function call(method, p, body, headers) {
  const r = await fetch(API + p, { method, headers: headers || { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch (e) {}
  return { status: r.status, body: json };
}

/** Login real (`POST /auth/login` con `username`): cabeceras con el token, o null. */
async function login(username, password) {
  const r = await call('POST', '/auth/login', { username, password });
  const t = r.body && r.body.access_token;
  return t ? auth(t) : null;
}

/** Cabeceras del usuario de un rol del .env (`DEMO_USER_<ROL>` / `DEMO_PASS_<ROL>`), o null si no está. */
async function loginAs(role) {
  const user = env[`DEMO_USER_${role}`];
  return user ? login(user, env[`DEMO_PASS_${role}`] || '') : null;
}

/**
 * Seguro duro: el token tiene que ser de la fábrica FACTORY_ID de su .env (`GET /auth/me`).
 * Nunca se prueba ni se escribe en otra fábrica por error. Lanza «ABORTO: …» si no coincide.
 */
async function assertFactory(headers) {
  if (!env.FACTORY_ID) throw new Error(`ABORTO: FACTORY_ID vacío en docs/integrations/${FACTORY}/.env.playwright.local (ponle el _id de la fábrica).`);
  if (!headers) throw new Error(`ABORTO: login fallido con DEMO_USER_ADMIN de ${FACTORY}.`);
  const me = await call('GET', '/auth/me', undefined, headers);
  const actual = me.body && me.body.factoryId ? String(me.body.factoryId) : null;
  if (actual !== String(env.FACTORY_ID)) {
    throw new Error(`ABORTO: las credenciales de ${FACTORY} son de la fábrica ${actual || '(ninguna)'}, no de FACTORY_ID ${env.FACTORY_ID}.`);
  }
  return actual;
}

/** Cabeceras del ADMIN: el token que pasa el lanzador o, lanzado suelto, un login nuevo. */
async function adminHeaders() {
  return process.env.DEMO_BEARER_TOKEN ? auth(process.env.DEMO_BEARER_TOKEN) : loginAs('ADMIN');
}

/** Imprime OK/FALLO y acumula el resultado; `done()` sale con código 1 si algo falló. */
let failures = 0;
function check(name, ok, info = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'FALLO'} ${name}${info ? ` — ${info}` : ''}`);
  return ok;
}
function done() {
  process.exit(failures ? 1 : 0);
}

module.exports = { FACTORY, env, API, auth, call, login, loginAs, assertFactory, adminHeaders, check, done };
