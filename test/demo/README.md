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
| `scope` | `orders-scope.test.js` | No (el PATCH reenvía el estado actual; el DELETE usa un id inexistente) | Alcance por rol (`DataScopeService`): OWNER/WORKER ven solo su fábrica y reciben 404 en detalle y cambio de estado de órdenes ajenas; SALES/USER, 404 en detalle fuera de su alcance; USER solo ve lo suyo; analytics de OWNER ignora `factoryId` de la query; `DELETE /quotes/:id` exige ADMIN (403). Sin datos fuera de alcance, marca `OMITIDO` |
| `scope` | `socket-scope.test.js` | No (el PATCH reenvía el estado actual) | Socket.io autenticado: sin token el servidor desconecta (paquete `41`); OWNER con token conecta y recibe `orders:update` de una orden de su fábrica. WebSocket nativo de Node, sin dependencias |

## Cómo añadir un test

1. Créalo en la carpeta de su grupo (o crea un grupo nuevo: una carpeta), con el nombre `<algo>.test.js`. Lo que empieza por `_` es utilidad y no se ejecuta.
2. Usa `require('../_lib/env')`: `env`, `call`, `login`, `loginAs(rol)`, `adminHeaders()`, `assertFactory()`, `check()` y `done()`.
3. Llama a `assertFactory()` antes de escribir. Imprime con `check(nombre, condición real, info)`; nunca `check(…, true)`.
4. Datos de prueba con prefijo «ZZ Prueba»/`zz.prueba.` y limpieza en `finally`.
5. Añádelo a la tabla de arriba.
