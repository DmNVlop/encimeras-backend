/**
 * Socket.io autenticado y con salas por alcance (EventsGateway + DataScopeService.roomsFor).
 * Usa el WebSocket nativo de Node (protocolo Engine.io v4 / Socket.io v5), sin dependencias.
 * No escribe: el PATCH reenvía el estado que la orden ya tiene, solo para disparar `orders:update`.
 */
const { API, call, loginAs, assertFactory, adminHeaders, check, done } = require('../_lib/env');

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

  // 2. OWNER recibe `orders:update` de una orden de su fábrica.
  const owner = await loginAs('OWNER');
  if (!check('login OWNER', !!owner)) return done();
  const list = await call('GET', '/orders', undefined, owner);
  const order = (list.body || [])[0];
  if (!order) { console.log('OMITIDO OWNER recibe orders:update — su fábrica no tiene órdenes'); return done(); }

  const sock = openSocket(tokenOf(owner));
  const connected = await sock.waitFor((m) => m.startsWith('40'));
  check('socket OWNER con token → conectado', !!connected, connected ? '' : 'sin paquete 40');
  if (connected) {
    const update = sock.waitFor((m) => m.startsWith('42') && m.includes('"orders:update"') && m.includes(String(order._id)));
    const p = await call('PATCH', `/orders/${order._id}/status`, { status: order.header.status }, owner);
    check('PATCH estado (mismo valor) → 200', p.status === 200, `status ${p.status}`);
    check('OWNER recibe orders:update de su orden', !!(await update));
  }
  sock.close();
  done();
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
