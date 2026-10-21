/**
 * Alcance de borradores: `GET /drafts` y `GET /drafts/:id` siguen `DataScopeService.toDraftFilter`.
 * Un borrador ajeno en alcance se lee con `isOwn: false` (el FE lo abre como copia) pero no se edita ni se borra.
 * Escribe: 1 draft «ZZ Prueba alcance <marca>» del USER y su evento DRAFT_SAVED. Todo se borra en el `finally`.
 */
const { randomUUID } = require('crypto');
const { env, call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');
const { findPricedPiece } = require('../_lib/fixtures');

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  const piece = await findPricedPiece(admin);
  if (!piece) { console.log('OMITIDO alcance de borradores — no hay material con receta ENCIMERA y precio configurado'); return done(); }

  const user = await loginAs('USER');
  const owner = await loginAs('OWNER');
  if (!check('login USER', !!user) || !check('login OWNER', !!owner)) return done();
  const me = await call('GET', '/auth/me', undefined, user);
  const userInFactory = String(me.body && me.body.factoryId) === String(env.FACTORY_ID);

  const quoteTraceId = randomUUID();
  const name = `ZZ Prueba alcance ${Date.now()}`;
  const core = { mainPieces: [piece], factoryId: String(env.FACTORY_ID) };
  let draftId = null;

  try {
    const created = await call('POST', '/drafts', { name, core, quoteTraceId }, user);
    draftId = created.body && created.body.id;
    if (!check('USER crea borrador → 201', created.status === 201 && !!draftId, `status ${created.status}`)) return;

    const own = await call('GET', '/drafts', undefined, user);
    const ownDraft = (own.body || []).find((d) => String(d._id) === String(draftId));
    check('USER ve su borrador con isOwn', own.status === 200 && !!ownDraft && ownDraft.isOwn === true, `status ${own.status}`);
    check('USER solo ve borradores propios', (own.body || []).every((d) => d.isOwn === true));

    if (!userInFactory) { console.log('OMITIDO OWNER ve borradores de su fábrica — el USER de pruebas no es de la fábrica'); return; }

    const list = await call('GET', '/drafts', undefined, owner);
    const seen = (list.body || []).find((d) => String(d._id) === String(draftId));
    check('OWNER ve el borrador del USER de su fábrica, marcado ajeno', list.status === 200 && !!seen && seen.isOwn === false, `status ${list.status}`);
    check('OWNER recibe el nombre del dueño', !!(seen && seen.ownerName));

    const one = await call('GET', `/drafts/${draftId}`, undefined, owner);
    check('OWNER abre el borrador ajeno → 200 con isOwn false', one.status === 200 && one.body.isOwn === false, `status ${one.status}`);

    const put = await call('PUT', `/drafts/${draftId}`, { name: `${name} pisado`, core }, owner);
    check('OWNER no puede editar el borrador ajeno → 404', put.status === 404, `status ${put.status}`);
    const del = await call('DELETE', `/drafts/${draftId}`, undefined, owner);
    check('OWNER no puede borrar el borrador ajeno → 404', del.status === 404, `status ${del.status}`);

    const after = await call('GET', `/drafts/${draftId}`, undefined, user);
    check('el borrador del USER sigue intacto', after.status === 200 && after.body.data.name === name, `status ${after.status}`);
  } finally {
    if (draftId) await call('DELETE', `/drafts/${draftId}`, undefined, user);
    const purge = await call('DELETE', `/quote-events/${quoteTraceId}`, undefined, admin);
    check('limpieza: borrador y traza borrados', purge.status === 200, `status ${purge.status}`);
    done();
  }
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
