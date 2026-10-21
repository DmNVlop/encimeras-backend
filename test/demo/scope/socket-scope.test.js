/**
 * Socket.io autenticado y con salas por alcance (EventsGateway + DataScopeService.roomsFor).
 * Usa el WebSocket nativo de Node (protocolo Engine.io v4 / Socket.io v5), sin dependencias.
 * Escribe: 1 orden de prueba «ZZ Prueba socket <marca>» del USER (PENDING → REVIEWED por el OWNER para disparar
 * `orders:update`), purgada en el `finally` con su draft y su traza.
 */
const { API, call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');
const { findPricedPiece, createTestOrder, purgeTestOrder } = require('../_lib/fixtures');

const WS_URL = API.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket';
const TIMEOUT = 5000; // tope de seguridad; cada espera termina en cuanto llega el paquete esperado

/** Abre un socket y conecta al namespace `/` con el token (o sin él). Devuelve helpers de espera. */
function openSocket(token) {
  const ws = new WebSocket(WS_URL);
  const waiters = [];
  ws.onmessage = ({ data }) => {
    const msg = String(data);
    if (msg === '2') return ws.send('3'); // ping → pong
    if (msg.startsWith('0')) return ws.send('40' + JSON.stringify(token ? { token } : {}));
    for (const w of [...waiters]) if (w.match(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
  };
  const waitFor = (match) => new Promise((resolve) => {
    const w = { match, resolve };
    waiters.push(w);
    setTimeout(() => { if (waiters.includes(w)) { waiters.splice(waiters.indexOf(w), 1); resolve(null); } }, TIMEOUT);
  });
  return { ws, waitFor, close: () => ws.close() };
}

const tokenOf = (headers) => headers.Authorization.replace(/^Bearer\s+/i, '');

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);

  // 1. Sin token: el servidor acepta el handshake y desconecta (paquete 41).
  const anon = openSocket(null);
  const kicked = await anon.waitFor((m) => m.startsWith('41'));
  check('socket sin token → desconectado por el servidor', !!kicked, kicked || 'sin paquete 41');
  anon.close();

  // 2. OWNER recibe `orders:update` de una orden de su fábrica (orden de prueba del USER).
  const owner = await loginAs('OWNER');
  const user = await loginAs('USER');
  if (!check('login OWNER', !!owner) || !check('login USER', !!user)) return done();
  const piece = await findPricedPiece(admin);
  if (!piece) { console.log('OMITIDO OWNER recibe orders:update — no hay material con receta ENCIMERA y precio configurado'); return done(); }

  const created = await createTestOrder(user, piece, 'socket');
  const sock = openSocket(tokenOf(owner));
  try {
    if (!check('USER crea orden de prueba', !created.error, created.error)) return;
    const connected = await sock.waitFor((m) => m.startsWith('40'));
    check('socket OWNER con token → conectado', !!connected, connected ? '' : 'sin paquete 40');
    if (connected) {
      const update = sock.waitFor((m) => m.startsWith('42') && m.includes('"orders:update"') && m.includes(String(created.orderId)));
      const p = await call('PATCH', `/orders/${created.orderId}/status`, { status: 'REVIEWED' }, owner);
      check('OWNER PATCH PENDING → REVIEWED → 200', p.status === 200, `status ${p.status}`);
      check('OWNER recibe orders:update de su orden', !!(await update));
    }
  } finally {
    sock.close();
    const purged = await purgeTestOrder(admin, user, created);
    check('limpieza: orden de prueba purgada', purged === 200, `status ${purged}`);
    done();
  }
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
