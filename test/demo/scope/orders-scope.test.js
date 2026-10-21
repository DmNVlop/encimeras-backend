/**
 * Alcance de datos por rol (DataScopeService) en órdenes, analytics y quotes.
 * No escribe: el único PATCH es sobre una orden ajena (404 antes de validar la transición) y el DELETE de quote usa un id inexistente.
 * Las comprobaciones cruzadas necesitan órdenes fuera del alcance de cada rol; si no las hay, se marcan OMITIDO.
 */
const { env, call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');

const ids = (list) => new Set((list || []).map((o) => String(o._id)));
const skip = (name) => console.log(`OMITIDO ${name} — no hay datos fuera de su alcance`);

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  const all = await call('GET', '/orders', undefined, admin);
  check('ADMIN lista órdenes → 200', all.status === 200, `status ${all.status}`);
  const allIds = ids(all.body);

  // OWNER y WORKER: toda su fábrica, nada más.
  for (const role of ['OWNER', 'WORKER']) {
    const h = await loginAs(role);
    if (!check(`login ${role}`, !!h)) continue;
    const r = await call('GET', '/orders', undefined, h);
    check(`${role} lista órdenes → 200`, r.status === 200, `status ${r.status}`);
    const mine = ids(r.body);

    const first = [...mine][0];
    if (first) {
      const d = await call('GET', `/orders/${first}`, undefined, h);
      const factories = new Set(((d.body && d.body.items) || []).map((i) => String(i.core && i.core.factoryId)));
      check(`${role} detalle de una orden suya es de su fábrica`, d.status === 200 && factories.size === 1 && factories.has(String(env.FACTORY_ID)), `status ${d.status}, fábricas ${[...factories]}`);
    }

    const foreign = [...allIds].find((id) => !mine.has(id));
    if (!foreign) { skip(`${role} sin acceso a órdenes de otra fábrica`); continue; }
    const d = await call('GET', `/orders/${foreign}`, undefined, h);
    check(`${role} detalle de orden ajena → 404`, d.status === 404, `status ${d.status}`);
    const current = all.body.find((o) => String(o._id) === foreign).header.status;
    const p = await call('PATCH', `/orders/${foreign}/status`, { status: current }, h);
    check(`${role} cambio de estado de orden ajena → 404`, p.status === 404, `status ${p.status}`);
  }

  // SALES y USER: el detalle se alinea con su listado (antes SALES abría cualquier orden).
  for (const role of ['SALES', 'USER']) {
    const h = await loginAs(role);
    if (!check(`login ${role}`, !!h)) continue;
    const r = await call('GET', '/orders', undefined, h);
    check(`${role} lista órdenes → 200`, r.status === 200, `status ${r.status}`);
    const mine = ids(r.body);
    if (role === 'USER') {
      const me = await call('GET', '/auth/me', undefined, h);
      const myId = String(me.body && me.body._id);
      check('USER solo ve órdenes creadas por él', (r.body || []).every((o) => String(o.header.userId) === myId));
    }
    const foreign = [...allIds].find((id) => !mine.has(id));
    if (!foreign) { skip(`${role} sin acceso a órdenes fuera de su alcance`); continue; }
    const d = await call('GET', `/orders/${foreign}`, undefined, h);
    check(`${role} detalle de orden fuera de su alcance → 404`, d.status === 404, `status ${d.status}`);
  }

  // Analytics: solo ADMIN puede acotar por factoryId; OWNER no puede salir de su fábrica con el parámetro.
  const owner = await loginAs('OWNER');
  if (owner) {
    const base = await call('GET', '/admin/analytics/summary', undefined, owner);
    // Id de otra fábrica: distinto de FACTORY_ID (la de DEMO es 000…0).
    const foreignFactory = String(env.FACTORY_ID) === 'ffffffffffffffffffffffff' ? 'eeeeeeeeeeeeeeeeeeeeeeee' : 'ffffffffffffffffffffffff';
    const other = await call('GET', `/admin/analytics/summary?factoryId=${foreignFactory}`, undefined, owner);
    check('OWNER analytics → 200', base.status === 200, `status ${base.status}`);
    check('OWNER analytics ignora factoryId de la query', JSON.stringify(base.body && base.body.summary) === JSON.stringify(other.body && other.body.summary));
  }

  // Quotes: el DELETE exige ADMIN (antes faltaba RolesGuard y cualquier usuario autenticado podía borrar).
  const user = await loginAs('USER');
  if (user) {
    const del = await call('DELETE', '/quotes/000000000000000000000000', undefined, user);
    check('USER no puede borrar quotes → 403', del.status === 403, `status ${del.status}`);
  }

  done();
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
