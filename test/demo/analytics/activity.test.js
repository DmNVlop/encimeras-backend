/**
 * Dashboard de actividad (`GET /admin/analytics/activity`) y resumen del portal (`GET /analytics/me`).
 * Escribe: 1 draft «ZZ Prueba actividad <marca>» del USER y sus eventos; se borran en el `finally` (eventos con la purga ADMIN).
 * El backfill solo se prueba en simulación (`dryRun`), nunca escribe.
 */
const { randomUUID } = require('crypto');
const { env, call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');
const { waitFor, findPricedPiece } = require('../_lib/fixtures');

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  const piece = await findPricedPiece(admin);
  if (!piece) { console.log('OMITIDO actividad — no hay material con receta ENCIMERA y precio configurado'); return done(); }

  const user = await loginAs('USER');
  if (!check('login USER', !!user)) return done();
  const me = await call('GET', '/auth/me', undefined, user);
  const myId = String(me.body && me.body._id);

  const quoteTraceId = randomUUID();
  const name = `ZZ Prueba actividad ${Date.now()}`;
  const core = { mainPieces: [piece], factoryId: String(env.FACTORY_ID) };
  let draftId = null;

  try {
    const created = await call('POST', '/drafts', { name, core, quoteTraceId }, user);
    draftId = created.body && created.body.id;
    if (!check('guardar draft → 201', created.status === 201 && !!draftId, `status ${created.status}`)) return;

    // DRAFT_SAVED se registra sin bloquear el guardado: se espera a que aparezca en el portal.
    const portal = await waitFor(async () => {
      const r = await call('GET', '/analytics/me', undefined, user);
      const mine = r.body && r.body.activity && r.body.activity.byUser.find((u) => u.id === myId);
      return { ok: r.status === 200 && !!mine && mine.draftSaved >= 1, r };
    });
    const summary = portal.r.body || {};
    check('portal USER → 200 con su actividad', portal.ok, `status ${portal.r.status}`);
    check('portal USER: alcance propio', summary.scope === 'own', `scope ${summary.scope}`);
    check('portal USER: el draft sale en recientes', !!summary.drafts && summary.drafts.recent.some((d) => d.id === draftId) && summary.drafts.active >= 1);
    check('portal USER: solo su fila por usuario', !!summary.activity && summary.activity.byUser.every((u) => u.id === myId), `filas ${summary.activity && summary.activity.byUser.map((u) => u.id)}`);
    check('portal USER: bloque de pedidos', !!summary.orders && Array.isArray(summary.orders.byStatus) && Array.isArray(summary.orders.recent));

    const forbidden = await call('GET', '/admin/analytics/activity', undefined, user);
    check('USER no ve la actividad de admin → 403', forbidden.status === 403, `status ${forbidden.status}`);

    const owner = await loginAs('OWNER');
    let ownerQuotes = null;
    if (owner) {
      const r = await call('GET', '/admin/analytics/activity', undefined, owner);
      const row = r.body && (r.body.byUser || []).find((u) => u.id === myId);
      ownerQuotes = r.body && r.body.funnel && r.body.funnel.quotes;
      check('OWNER ve al USER de su fábrica con su draft', r.status === 200 && !!row && row.draftSaved >= 1, `status ${r.status}`);
      const future = await call('GET', '/admin/analytics/activity?startDate=2999-01-01', undefined, owner);
      check('filtro de fechas: futuro sin actividad', future.status === 200 && future.body.funnel.quotes === 0, `quotes ${future.body && future.body.funnel && future.body.funnel.quotes}`);
      const bad = await call('GET', '/admin/analytics/activity?startDate=ayer', undefined, owner);
      check('fecha no ISO → 400', bad.status === 400, `status ${bad.status}`);
    } else {
      console.log('OMITIDO OWNER — falta DEMO_USER_OWNER');
    }

    const sales = await loginAs('SALES');
    if (sales && ownerQuotes !== null) {
      const r = await call('GET', '/admin/analytics/activity', undefined, sales);
      check('SALES ve como mucho lo de su fábrica', r.status === 200 && r.body.funnel.quotes <= ownerQuotes, `SALES ${r.body && r.body.funnel && r.body.funnel.quotes}, OWNER ${ownerQuotes}`);
      const p = await call('GET', '/analytics/me', undefined, sales);
      check('portal SALES → 200', p.status === 200 && ['own', 'team'].includes(p.body && p.body.scope), `status ${p.status}, scope ${p.body && p.body.scope}`);
    }

    const dry = await call('POST', '/quote-events/backfill', undefined, admin);
    check('backfill sin dryRun=false es simulación', dry.status === 201 && dry.body && dry.body.dryRun === true, `status ${dry.status}, ${JSON.stringify(dry.body)}`);
    const userBackfill = await call('POST', '/quote-events/backfill?dryRun=false', undefined, user);
    check('USER no lanza el backfill → 403', userBackfill.status === 403, `status ${userBackfill.status}`);
  } finally {
    if (draftId) await call('DELETE', `/drafts/${draftId}`, undefined, user);
    const purge = await call('DELETE', `/quote-events/${quoteTraceId}`, undefined, admin);
    const left = await call('GET', `/quote-events?quoteTraceId=${quoteTraceId}`, undefined, admin);
    check('limpieza: ADMIN purga la traza y no queda nada', purge.status === 200 && (left.body || []).length === 0, `status ${purge.status}, quedan ${(left.body || []).length}`);
  }

  done();
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
