/**
 * Bandeja paginada de órdenes (`GET /orders/search`): filtro por estados y texto, contadores por estado,
 * nombres resueltos (BFF), `statusActions` por fila, paginación, validación de la query y alcance.
 * Escribe: 1 orden «ZZ Prueba bandeja <marca>» del USER; se purga en el `finally` con su draft y su traza.
 */
const { call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');
const { findPricedPiece, createTestOrder, purgeTestOrder } = require('../_lib/fixtures');

const search = (query, h) => call('GET', `/orders/search?${new URLSearchParams(query)}`, undefined, h);

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  const user = await loginAs('USER');
  const owner = await loginAs('OWNER');
  if (!check('login USER', !!user) || !check('login OWNER', !!owner)) return done();

  let r = await search({ limit: '500' }, owner);
  check('limit > 100 → 400', r.status === 400, `status ${r.status}`);
  r = await search({ status: 'PENDING,NOPE' }, owner);
  check('estado inexistente → 400', r.status === 400, `status ${r.status}`);

  const piece = await findPricedPiece(admin);
  if (!piece) { console.log('OMITIDO bandeja de órdenes — no hay material con receta ENCIMERA y precio configurado'); return done(); }

  const created = await createTestOrder(user, piece, 'bandeja');
  try {
    if (!check('USER crea orden de prueba (PENDING)', !created.error, created.error)) return;

    r = await search({ q: created.name, status: 'PENDING,REVIEWED' }, owner);
    const row = r.body && (r.body.items || []).find((o) => o._id === String(created.orderId));
    check('OWNER: búsqueda por nombre + estados la encuentra', r.status === 200 && !!row, `status ${r.status}`);
    check('fila con nombre del vendedor resuelto', !!row && typeof row.userName === 'string' && row.userName.length > 0, row && row.userName);
    check('fila sin statusHistory (listado ligero) y con lastStatusChangeAt', !!row && row.statusHistory === undefined && !!row.lastStatusChangeAt);
    check('fila con statusActions del OWNER (REVIEWED, REJECTED, CANCELLED)', !!row && row.statusActions.targets.join() === 'REVIEWED,REJECTED,CANCELLED', row && JSON.stringify(row.statusActions));
    check('contadores por estado incluyen PENDING ≥ 1', !!r.body && (r.body.counts.PENDING || 0) >= 1, r.body && JSON.stringify(r.body.counts));

    r = await search({ q: created.name, status: 'SHIPPED' }, owner);
    check('filtro de estado excluye la orden; contadores no dependen del estado', r.status === 200 && r.body.total === 0 && (r.body.counts.PENDING || 0) >= 1, r.body && JSON.stringify({ total: r.body.total, counts: r.body.counts }));

    r = await search({ q: created.name }, user);
    const own = r.body && (r.body.items || []).find((o) => o._id === String(created.orderId));
    check('USER ve su orden con solo CANCELLED como acción', !!own && own.statusActions.targets.join() === 'CANCELLED', own && JSON.stringify(own.statusActions));

    r = await search({ limit: '1', page: '0' }, owner);
    check('paginación: limit 1 devuelve 1 fila y total ≥ 1', r.status === 200 && r.body.items.length === 1 && r.body.total >= 1 && r.body.limit === 1, `status ${r.status}`);

    const detail = await call('GET', `/orders/${created.orderId}`, undefined, owner);
    check('detalle con display.userName (BFF)', detail.status === 200 && !!detail.body.display && !!detail.body.display.userName, detail.body && JSON.stringify(detail.body.display));
  } finally {
    const status = await purgeTestOrder(admin, user, created);
    check('limpieza: orden de prueba purgada', status === 200, `status ${status}`);
  }
  done();
})();
