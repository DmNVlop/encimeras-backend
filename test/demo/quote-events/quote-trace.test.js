/**
 * Trazabilidad de presupuestos (`quote_events`): un mismo quoteTraceId une cálculo → draft → cart → PDF.
 * Escribe: 1 draft y 1 ítem de carrito «ZZ Prueba traza <marca>» del USER, y sus eventos. Todo se borra en el `finally`
 * (los eventos con la purga ADMIN). No crea órdenes: ORDERED no se cubre aquí porque las órdenes no se pueden borrar.
 */
const { randomUUID } = require('crypto');
const { env, call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');
const { waitFor, findPricedPiece } = require('../_lib/fixtures');

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  const piece = await findPricedPiece(admin);
  if (!piece) { console.log('OMITIDO trazabilidad — no hay material con receta ENCIMERA y precio configurado'); return done(); }

  const user = await loginAs('USER');
  if (!check('login USER', !!user)) return done();
  const me = await call('GET', '/auth/me', undefined, user);
  const myId = String(me.body && me.body._id);

  const quoteTraceId = randomUUID();
  const name = `ZZ Prueba traza ${Date.now()}`;
  const core = { mainPieces: [piece], factoryId: String(env.FACTORY_ID) };
  let draftId = null;
  let cartItemId = null;

  try {
    const calc = await call('POST', '/quotes/calculate', { ...core, quoteTraceId }, user);
    check('calcular con quoteTraceId → 201', calc.status === 201, `status ${calc.status}`);

    const created = await call('POST', '/drafts', { name, core, quoteTraceId }, user);
    draftId = created.body && created.body.id;
    check('guardar draft → 201', created.status === 201 && !!draftId, `status ${created.status}`);

    const updated = await call('PUT', `/drafts/${draftId}`, { name, core, quoteTraceId: randomUUID() }, user);
    const draft = await call('GET', `/drafts/${draftId}`, undefined, user);
    check('actualizar draft conserva su quoteTraceId', updated.status === 200 && draft.body && draft.body.data && draft.body.data.quoteTraceId === quoteTraceId, `status ${updated.status}, id ${draft.body && draft.body.data && draft.body.data.quoteTraceId}`);

    const expected = ['CALCULATED', 'DRAFT_SAVED', 'DRAFT_SAVED'];

    // PDF del carrito: solo con el carrito vacío, para no registrar eventos de presupuestos que no son de la prueba.
    const cart = await call('GET', '/cart', undefined, user);
    if ((cart.body && cart.body.items || []).length) {
      console.log('OMITIDO PDF del carrito — el carrito del USER no está vacío');
    } else {
      const added = await call('POST', '/cart/items', { customName: name, core, draftId, quoteTraceId }, user);
      const item = (added.body && added.body.items || []).find((i) => i.quoteTraceId === quoteTraceId);
      cartItemId = item && item.cartItemId;
      check('añadir al carrito con el mismo quoteTraceId', added.status === 201 && !!item, `status ${added.status}`);

      const pdf = await call('POST', '/quote-events/pdf-download', { source: 'cart' }, user);
      check('PDF del carrito → 1 evento', pdf.status === 201 && pdf.body && pdf.body.recorded === 1, `status ${pdf.status}, ${JSON.stringify(pdf.body)}`);
      expected.push('CART_ADDED', 'PDF_DOWNLOADED');
    }

    // Los eventos de servidor se registran sin bloquear la operación: se espera a tenerlos todos.
    const timeline = await waitFor(async () => {
      const r = await call('GET', `/quote-events?quoteTraceId=${quoteTraceId}`, undefined, user);
      return { ok: r.status === 200 && (r.body || []).length >= expected.length, r };
    });
    const events = (timeline.r.body || []);
    check('cronología con todos los eventos', timeline.ok && JSON.stringify(events.map((e) => e.type).sort()) === JSON.stringify([...expected].sort()), `tipos ${events.map((e) => e.type)}`);
    check('eventos del USER y de su fábrica', events.length > 0 && events.every((e) => e.userId === myId && e.factoryId === String(env.FACTORY_ID)));
    if (cartItemId) {
      const pdfEvent = events.find((e) => e.type === 'PDF_DOWNLOADED');
      check('PDF enlazado al draft y al ítem', !!pdfEvent && pdfEvent.draftId === draftId && pdfEvent.cartItemId === cartItemId);
      const cartEvent = events.find((e) => e.type === 'CART_ADDED');
      check('CART_ADDED enlazado al draft y al ítem', !!cartEvent && cartEvent.draftId === draftId && cartEvent.cartItemId === cartItemId);
    }

    const owner = await loginAs('OWNER');
    if (owner) {
      const r = await call('GET', `/quote-events?quoteTraceId=${quoteTraceId}`, undefined, owner);
      check('OWNER de la fábrica ve la cronología', r.status === 200 && (r.body || []).length === events.length, `status ${r.status}, ${(r.body || []).length} eventos`);
    }

    const anon = await call('POST', '/quotes/calculate', core);
    check('calcular sin token sigue respondiendo → 201', anon.status === 201, `status ${anon.status}`);
    const noTrace = await call('GET', '/quote-events', undefined, user);
    check('cronología sin quoteTraceId → 400', noTrace.status === 400, `status ${noTrace.status}`);
    const noOrder = await call('POST', '/quote-events/pdf-download', { source: 'order' }, user);
    check('PDF de orden sin orderId → 400', noOrder.status === 400, `status ${noOrder.status}`);
    const userPurge = await call('DELETE', `/quote-events/${quoteTraceId}`, undefined, user);
    check('USER no puede purgar → 403', userPurge.status === 403, `status ${userPurge.status}`);
  } finally {
    if (cartItemId) await call('DELETE', `/cart/items/${cartItemId}`, undefined, user);
    if (draftId) await call('DELETE', `/drafts/${draftId}`, undefined, user);
    const purge = await call('DELETE', `/quote-events/${quoteTraceId}`, undefined, admin);
    const left = await call('GET', `/quote-events?quoteTraceId=${quoteTraceId}`, undefined, admin);
    check('limpieza: ADMIN purga la traza y no queda nada', purge.status === 200 && (left.body || []).length === 0, `status ${purge.status}, quedan ${(left.body || []).length}`);
  }

  done();
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
