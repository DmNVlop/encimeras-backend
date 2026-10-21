# Pruebas de API contra una fábrica (`backend/test/demo/`)

Pruebas de regresión que se lanzan por grupos contra el **backend en marcha**, usando la **fábrica de pruebas DEMO**. Node puro (`fetch`, Node ≥ 22), sin Jest. El e2e Jest (`npm run test:e2e`) sigue aparte.

Cada test que escribe solo toca datos con prefijo **«ZZ Prueba» / `zz.prueba.`** y los borra en un `finally`: la BD no queda con residuos.

## Cómo se lanzan

```
cd backend
npm run test:demo                                 # lista los grupos
npm run test:demo -- users factory=DEMO           # un grupo
npm run test:demo -- users otro factory=DEMO      # varios
npm run test:demo -- all factory=DEMO             # todos
```

- **La fábrica es obligatoria** (`factory=DEMO`) y no tiene valor por defecto. Sin ella no se ejecuta nada. Se escribe sin guiones: en PowerShell, `--factory` se lo queda npm.
- **Credenciales:** `docs/integrations/<Fábrica>/.env.playwright.local`, fuera de git, con las claves `FACTORY_ID`, `API_URL`, `FE_URL` y `DEMO_USER_<ROL>`/`DEMO_PASS_<ROL>` por rol (`ADMIN` obligatorio; `OWNER`, `MANAGER`, `SALES`, `WORKER`, `USER` si algún test los usa). Ningún `.env*` de pruebas se versiona, ni siquiera de plantilla. Nunca se copian aquí.
- **Seguro de fábrica:** antes de nada, el lanzador hace login con `DEMO_USER_ADMIN` (`POST /auth/login`) y comprueba con `GET /auth/me` que su `factoryId` es `FACTORY_ID` del `.env`. Si no coincide o falta, `ABORTO`.
- **Resultado:** cada comprobación imprime `OK`/`FALLO`; al final, resumen por test. El lanzador sale con código 1 si algún test falla (código ≠ 0 o línea `FALLO`/`ABORTO`).

## Grupos

| Grupo | Test | ¿Escribe? | Qué cubre |
|---|---|---|---|
| `users` | `generate-password.test.js` | Sí: 1 usuario `zz.prueba.pass.<marca>` (rol USER), borrado al final | `POST /users` con `generatePassword`: 201, `generatedPassword` de 12 caracteres, sin hash en la respuesta, login con ella, `factoryId` inferido del ADMIN; sin `password` ni `generatePassword` → 400 |
| `scope` | `orders-scope.test.js` | No (el PATCH es sobre una orden ajena ⇒ 404; el DELETE usa un id inexistente) | Alcance por rol (`DataScopeService`): OWNER/WORKER ven solo su fábrica y reciben 404 en detalle y cambio de estado de órdenes ajenas; SALES/USER, 404 en detalle fuera de su alcance; USER solo ve lo suyo; analytics de OWNER ignora `factoryId` de la query; `DELETE /quotes/:id` exige ADMIN (403). Sin datos fuera de alcance, marca `OMITIDO` |
| `quote-events` | `quote-trace.test.js` | Sí: 1 draft y 1 ítem de carrito «ZZ Prueba traza <marca>» del USER y sus eventos; se borran al final (eventos con la purga ADMIN `DELETE /quote-events/:quoteTraceId`) | Trazabilidad: el mismo `quoteTraceId` une CALCULATED → DRAFT_SAVED (alta y edición, que conserva el id) → CART_ADDED (enlazado a draft e ítem) → PDF_DOWNLOADED del carrito; eventos con usuario y fábrica; OWNER ve la cronología; `/quotes/calculate` sigue siendo público; 400 sin `quoteTraceId` o sin `orderId`; USER no purga (403). PDF del carrito `OMITIDO` si el carrito del USER no está vacío. No crea órdenes: ORDERED no se cubre |
| `scope` | `socket-scope.test.js` | Sí: 1 orden «ZZ Prueba socket <marca>» del USER (OWNER la pasa a REVIEWED), purgada al final con su draft y su traza | Socket.io autenticado: sin token el servidor desconecta (paquete `41`); OWNER con token conecta y recibe `orders:update` de una orden de su fábrica. WebSocket nativo de Node, sin dependencias |
| `scope` | `drafts-scope.test.js` | Sí: 1 draft «ZZ Prueba alcance» del USER + su traza, borrados en el `finally` | Alcance de borradores: USER ve solo los suyos (`isOwn: true`); OWNER ve el del USER de su fábrica con `isOwn: false` y `ownerName`, lo abre (`GET /drafts/:id` → 200, `isOwn: false`) pero `PUT`/`DELETE` → 404 y el original queda intacto |
| `analytics` | `activity.test.js` | Sí: 1 draft «ZZ Prueba actividad <marca>» del USER y sus eventos; se borran al final (eventos con la purga ADMIN). El backfill solo en simulación | Dashboard: `GET /analytics/me` del USER (alcance propio, su draft en recientes, solo su fila, bloque de pedidos); USER sin acceso a `GET /admin/analytics/activity` (403); OWNER ve al USER de su fábrica, embudo acumulativo (carrito ≥ pedidos), filtro de fechas y 400 con fecha no ISO; SALES no ve más que OWNER; `POST /quote-events/backfill` sin `dryRun=false` no escribe y USER recibe 403 |
| `orders` | `status-flow.test.js` | Sí: 1 orden «ZZ Prueba estados <marca>» del USER desde un draft propio; se purga al final (`DELETE /orders/:id`, ADMIN) con su draft y su traza | Flujo de estados: `GET /orders/status-flow`; `statusActions` por usuario en el detalle; transición inexistente → 400, sin permiso → 403 (USER, WORKER), nota vacía en REJECTED/CANCELLED → 400; WORKER revisa, OWNER aprueba; historial append-only; deshacer (nota obligatoria, pila: dos seguidos vuelven a PENDING, un tercero → 400); USER cancela lo suyo en PENDING; CANCELLED final, OWNER lo reabre con deshacer; purga solo ADMIN (403) y solo «ZZ Prueba» (orden real → 400). Sin `DEMO_USER_WORKER`, lo de WORKER sale `OMITIDO` |
| | `search.test.js` | Sí: 1 orden «ZZ Prueba bandeja <marca>» del USER; se purga al final con su draft y su traza | Bandeja paginada `GET /orders/search`: query inválida (limit > 100, estado inexistente) → 400; búsqueda por nombre + estados; nombres resueltos (`userName`), fila ligera sin `statusHistory` con `lastStatusChangeAt`; `statusActions` por fila (OWNER vs USER); contadores por estado independientes del filtro de estado; paginación; `display` en el detalle |

## Cómo añadir un test

1. Créalo en la carpeta de su grupo (o crea un grupo nuevo: una carpeta), con el nombre `<algo>.test.js`. Lo que empieza por `_` es utilidad y no se ejecuta.
2. Usa `require('../_lib/env')`: `env`, `call`, `login`, `loginAs(rol)`, `adminHeaders()`, `assertFactory()`, `check()` y `done()`. Para presupuestos, `require('../_lib/fixtures')`: `waitFor()`, `findPricedPiece()` y, para órdenes, `createTestOrder()` + `purgeTestOrder()` (orden «ZZ Prueba» purgable por ADMIN).
3. Llama a `assertFactory()` antes de escribir. Imprime con `check(nombre, condición real, info)`; nunca `check(…, true)`.
4. Datos de prueba con prefijo «ZZ Prueba»/`zz.prueba.` y limpieza en `finally`.
5. Añádelo a la tabla de arriba.
