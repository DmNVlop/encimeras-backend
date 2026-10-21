/** Utilidades compartidas por los tests que crean presupuestos. */
const { call } = require('./env');

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

module.exports = { waitFor, findPricedPiece };
