/** Utilidades compartidas por los tests que crean presupuestos. */
const { randomUUID } = require('crypto');
const { env, call } = require('./env');

/** Espera a que `fn` devuelva algo con valor (polling sobre la condición, no una espera fija). */
async function waitFor(fn, timeoutMs = 10000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last.ok) return last;
    await new Promise((r) => setTimeout(r, 250));
  }
  return last;
}

/** Pieza con precio real en la BD: material con receta ENCIMERA + price-config cuya combinación encaje con ella. */
async function findPricedPiece(admin) {
  const [materials, prices] = await Promise.all([call('GET', '/materials', undefined, admin), call('GET', '/price-configs', undefined, admin)]);
  const configs = (prices.body || []).filter((p) => p.productType === 'ENCIMERA');
  for (const m of materials.body || []) {
    const recipe = (m.pricingRecipes || []).find((r) => r.productType === 'ENCIMERA');
    if (!recipe) continue;
    const keys = [...recipe.pricingAttributes].sort().join('|');
    const config = configs.find((c) => c.combinationKey.split('||').map((kv) => kv.split(':')[0]).sort().join('|') === keys);
    if (!config) continue;
    const selectedAttributes = Object.fromEntries(config.combinationKey.split('||').map((kv) => kv.split(':')));
    return { materialId: String(m._id), selectedAttributes, length_mm: 2000, width_mm: 600 };
  }
  return null;
}

/**
 * Orden de prueba «ZZ Prueba <etiqueta> <marca>» del usuario `user`, creada desde un draft propio (`POST /orders`).
 * Devuelve { orderId, draftId, quoteTraceId } (lo creado hasta el fallo, para limpiar) y `error` si algo falló.
 * Se limpia SIEMPRE con `purgeTestOrder` en el `finally`.
 */
async function createTestOrder(user, piece, label) {
  const quoteTraceId = randomUUID();
  const name = `ZZ Prueba ${label} ${Date.now()}`;
  const created = { orderId: null, draftId: null, quoteTraceId, name };
  const draft = await call('POST', '/drafts', { name, core: { mainPieces: [piece], factoryId: String(env.FACTORY_ID) }, quoteTraceId }, user);
  created.draftId = draft.body && draft.body.id;
  if (!created.draftId) return { ...created, error: `POST /drafts → ${draft.status}` };
  const order = await call('POST', '/orders', { orderName: name, draftId: created.draftId }, user);
  created.orderId = order.body && order.body.orderId;
  if (!created.orderId) return { ...created, error: `POST /orders → ${order.status}` };
  return created;
}

/** Borra la orden de prueba (purga ADMIN, incluye su trazabilidad) y el draft convertido. Devuelve el status de la purga. */
async function purgeTestOrder(admin, user, created) {
  let status = 200;
  if (created.orderId) status = (await call('DELETE', `/orders/${created.orderId}`, undefined, admin)).status;
  if (created.draftId) await call('DELETE', `/drafts/${created.draftId}`, undefined, user);
  // Si la orden no llegó a crearse, la traza del draft no tiene ORDERED y se purga por la vía normal
  if (!created.orderId) await call('DELETE', `/quote-events/${created.quoteTraceId}`, undefined, admin);
  return status;
}

module.exports = { waitFor, findPricedPiece, createTestOrder, purgeTestOrder };
