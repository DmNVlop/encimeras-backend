/**
 * Alta de usuario con contraseña generada por el backend (`POST /users` con `generatePassword`).
 * Escribe: 1 usuario «zz.prueba.pass.<marca>» (rol USER) que se borra en el `finally`.
 */
const { env, call, login, assertFactory, adminHeaders, check, done } = require('../_lib/env');

(async () => {
  const admin = await adminHeaders();
  await assertFactory(admin);
  const username = `zz.prueba.pass.${Date.now()}`;
  let createdId = null;
  try {
    const r = await call('POST', '/users', { username, name: 'ZZ Prueba contraseña', generatePassword: true, roles: ['USER'] }, admin);
    createdId = r.body && r.body._id;
    check('alta con generatePassword → 201', r.status === 201, `status ${r.status}`);
    const pass = r.body && r.body.generatedPassword;
    check('devuelve generatedPassword de 12 caracteres', typeof pass === 'string' && pass.length === 12, `longitud ${pass && pass.length}`);
    check('la respuesta no trae el hash', r.body && r.body.password === undefined);

    const user = pass ? await login(username, pass) : null;
    check('login con la contraseña generada', !!user);
    if (user) {
      const me = await call('GET', '/auth/me', undefined, user);
      check('factoryId del usuario = la del ADMIN', me.body && String(me.body.factoryId) === String(env.FACTORY_ID), `factoryId ${me.body && me.body.factoryId}`);
    }

    const bad = await call('POST', '/users', { username: `${username}.b`, roles: ['USER'] }, admin);
    check('sin password ni generatePassword → 400', bad.status === 400, `status ${bad.status}`);
    if (bad.body && bad.body._id) await call('DELETE', `/users/${bad.body._id}`, undefined, admin);
  } catch (e) {
    check('sin excepciones', false, e.message);
  } finally {
    if (createdId) {
      const del = await call('DELETE', `/users/${createdId}`, undefined, admin);
      check('limpieza: usuario de prueba borrado', del.status === 200, `status ${del.status}`);
    }
  }
  done();
})().catch((e) => { console.log(e.message.startsWith('ABORTO') ? e.message : `FALLO ${e.message}`); process.exit(1); });
