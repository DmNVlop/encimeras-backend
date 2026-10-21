/**
 * Flujo de estados de órdenes (order-status-flow.ts): transiciones, permisos por rol, nota obligatoria,
 * historial append-only, «deshacer» y purga de órdenes de prueba.
 * Escribe: 1 orden «ZZ Prueba estados <marca>» del USER (desde un draft propio) que recorre el flujo;
 * se purga en el `finally` con su draft y su traza. Sin WORKER en el .env, sus comprobaciones se marcan OMITIDO.
 */
const { call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');
const { findPricedPiece, createTestOrder, purgeTestOrder } = require('../_lib/fixtures');

const patch = (id, body, h) => call('PATCH', `/orders/${id}/status`, body, h);
const undo = (id, body, h) => call('POST', `/orders/${id}/status/undo`, body, h);
const statusOf = async (id, h) => {
  const r = await call('GET', `/orders/${id}`, undefined, h);
  return r.body && r.body.header ? r.body.header.status : `HTTP ${r.status}`;
};

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  const user = await loginAs('USER');
  const owner = await loginAs('OWNER');
  const worker = await loginAs('WORKER');
  if (!check('login USER', !!user) || !check('login OWNER', !!owner)) return done();

  const flow = await call('GET', '/orders/status-flow', undefined, user);
  check('GET /orders/status-flow → 200 con el mapa', flow.status === 200 && flow.body && (flow.body.transitions.PENDING || []).includes('REVIEWED'), `status ${flow.status}`);
  check('status-flow: REJECTED, CANCELLED e INSTALLED son finales', flow.body && ['REJECTED', 'CANCELLED', 'INSTALLED'].every((s) => flow.body.finalStatuses.includes(s)));

  const piece = await findPricedPiece(admin);
  if (!piece) { console.log('OMITIDO flujo de estados — no hay material con receta ENCIMERA y precio configurado'); return done(); }

  const created = await createTestOrder(user, piece, 'estados');
  const id = created.orderId;
  try {
    if (!check('USER crea orden de prueba (PENDING)', !created.error, created.error)) return;

    // Acciones resueltas por el BE para cada usuario
    const mine = await call('GET', `/orders/${id}`, undefined, user);
    const actions = mine.body && mine.body.statusActions;
    check('USER: su orden PENDING solo permite CANCELLED y no deshacer', !!actions && actions.targets.join() === 'CANCELLED' && actions.canUndo === false, JSON.stringify(actions));
    const ownerView = await call('GET', `/orders/${id}`, undefined, owner);
    check('OWNER: desde PENDING puede REVIEWED, REJECTED y CANCELLED', ownerView.body && ownerView.body.statusActions.targets.join() === 'REVIEWED,REJECTED,CANCELLED');

    // Transición inexistente ⇒ 400; sin permiso ⇒ 403
    let r = await patch(id, { status: 'MANUFACTURING' }, owner);
    check('PENDING → MANUFACTURING (no existe) → 400', r.status === 400, `status ${r.status}`);
    r = await patch(id, { status: 'REVIEWED' }, user);
    check('USER no puede pasar a REVIEWED → 403', r.status === 403, `status ${r.status}`);
    r = await patch(id, { status: 'REJECTED', note: '   ' }, owner);
    check('REJECTED con nota vacía → 400', r.status === 400, `status ${r.status}`);

    // PENDING → REVIEWED (WORKER si existe; si no, OWNER)
    r = await patch(id, { status: 'REVIEWED' }, worker || owner);
    check(`${worker ? 'WORKER' : 'OWNER'} PENDING → REVIEWED → 200`, r.status === 200 && r.body.header.status === 'REVIEWED', `status ${r.status}`);
    if (worker) {
      r = await patch(id, { status: 'APPROVED' }, worker);
      check('WORKER no puede aprobar → 403', r.status === 403, `status ${r.status}`);
      r = await undo(id, { note: 'ZZ prueba' }, worker);
      check('WORKER no puede deshacer → 403', r.status === 403, `status ${r.status}`);
    } else console.log('OMITIDO permisos de WORKER — falta DEMO_USER_WORKER');

    r = await patch(id, { status: 'CANCELLED', note: 'ZZ prueba' }, user);
    check('USER no cancela fuera de PENDING → 403', r.status === 403, `status ${r.status}`);

    r = await patch(id, { status: 'APPROVED' }, owner);
    check('OWNER REVIEWED → APPROVED → 200', r.status === 200 && r.body.header.status === 'APPROVED', `status ${r.status}`);
    const history = (r.body && r.body.header.statusHistory) || [];
    check('historial con 2 cambios (from/to/by/at)', history.length === 2 && history.every((h) => h.from && h.to && h.by && h.at) && history[1].to === 'APPROVED', `entradas ${history.length}`);

    // Deshacer: nota obligatoria; pila de cambios (dos deshacer seguidos vuelven a PENDING; un tercero ⇒ 400)
    r = await undo(id, {}, owner);
    check('deshacer sin nota → 400', r.status === 400, `status ${r.status}`);
    r = await undo(id, { note: 'ZZ prueba deshacer 1' }, owner);
    check('OWNER deshace APPROVED → REVIEWED', r.status === 200 && r.body.header.status === 'REVIEWED', `status ${r.status}`);
    const last = r.body && r.body.header.statusHistory.slice(-1)[0];
    check('la entrada de deshacer queda en el historial (undo, nota)', !!last && last.undo === true && last.note === 'ZZ prueba deshacer 1');
    r = await undo(id, { note: 'ZZ prueba deshacer 2' }, owner);
    check('segundo deshacer → PENDING', r.status === 200 && r.body.header.status === 'PENDING', `status ${r.status}`);
    r = await undo(id, { note: 'ZZ prueba deshacer 3' }, owner);
    check('nada más que deshacer → 400', r.status === 400, `status ${r.status}`);

    // USER cancela lo suyo en PENDING (con nota); CANCELLED es final; OWNER lo reabre con deshacer
    r = await patch(id, { status: 'CANCELLED' }, user);
    check('USER cancela sin nota → 400', r.status === 400, `status ${r.status}`);
    r = await patch(id, { status: 'CANCELLED', note: 'ZZ prueba: ya no lo necesito' }, user);
    check('USER cancela su orden PENDING → 200', r.status === 200 && r.body.header.status === 'CANCELLED', `status ${r.status}`);
    r = await patch(id, { status: 'PENDING' }, owner);
    check('CANCELLED es final → 400', r.status === 400, `status ${r.status}`);
    r = await undo(id, { note: 'ZZ prueba reabrir' }, owner);
    check('OWNER reabre con deshacer → PENDING', r.status === 200 && (await statusOf(id, owner)) === 'PENDING', `status ${r.status}`);

    // Purga: solo ADMIN y solo órdenes «ZZ Prueba»
    r = await call('DELETE', `/orders/${id}`, undefined, user);
    check('USER no purga órdenes → 403', r.status === 403, `status ${r.status}`);
    const all = await call('GET', '/orders', undefined, admin);
    const real = (all.body || []).find((o) => !String(o.header.orderName).startsWith('ZZ Prueba'));
    if (real) {
      r = await call('DELETE', `/orders/${real._id}`, undefined, admin);
      check('ADMIN no puede purgar una orden real → 400', r.status === 400, `status ${r.status}`);
    } else console.log('OMITIDO purga de orden real rechazada — no hay órdenes reales');
  } finally {
    const purged = await purgeTestOrder(admin, user, created);
    check('limpieza: orden de prueba purgada', purged === 200, `status ${purged}`);
    if (id) {
      const gone = await call('GET', `/orders/${id}`, undefined, admin);
      const trace = await call('GET', `/quote-events?quoteTraceId=${created.quoteTraceId}`, undefined, admin);
      check('tras la purga: orden 404 y traza vacía', gone.status === 404 && Array.isArray(trace.body) && trace.body.length === 0, `orden ${gone.status}, eventos ${trace.body && trace.body.length}`);
    }
    done();
  }
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
