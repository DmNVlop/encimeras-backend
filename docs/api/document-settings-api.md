# Documentación Técnica: Configuración de Documentos (Document Settings)

Este módulo permite gestionar la configuración de los documentos PDF generados por el sistema, como el texto del footer y la validez del presupuesto. Las configuraciones se almacenan por fábrica (`factoryId`) y opcionalmente por usuario (`userId`), permitiendo condiciones diferenciadas por comercial.

## Conceptos Clave

- **Alcance por fábrica**: Cada fábrica tiene su propia configuración de documentos.
- **Override por usuario**: Si se configura un `userId`, esa configuración tiene prioridad sobre la configuración general de la fábrica.
- **Resolución automática**: Al solicitar la configuración, el sistema busca primero una configuración específica por usuario. Si no existe, devuelve la configuración por defecto de la fábrica (`userId: null`).
- **Validez del presupuesto**: El campo `validityDays` define cuántos días es válido un presupuesto desde su fecha de generación.
- **Footer del PDF**: El campo `footerText` es el párrafo que aparece en el pie del documento PDF, donde se informan condiciones, términos de validez y otra información relevante.

---

## Modelo de Datos (DocumentSettings)

| Campo          | Tipo             | Descripción                                                                                                    |
| :------------- | :--------------- | :------------------------------------------------------------------------------------------------------------- |
| `_id`          | `ObjectId`       | Identificador único de la configuración.                                                                       |
| `factoryId`    | `string`         | ID de la fábrica propietaria de la configuración.                                                              |
| `userId`       | `string \| null` | ID del usuario para override. `null` = configuración por defecto de la fábrica.                                |
| `validityDays` | `number`         | Días de validez del presupuesto (por defecto: 30).                                                             |
| `footerText`   | `string`         | Texto del footer del PDF (por defecto: "Presupuesto válido por 30 días desde su emisión... Validez 30 días."). |
| `createdAt`    | `Date`           | Fecha de creación (auto-generado).                                                                             |
| `updatedAt`    | `Date`           | Fecha de última actualización (auto-generado).                                                                 |

> **Nota**: Existe un índice único en `{ factoryId: 1, userId: 1 }` para evitar configuraciones duplicadas.

---

## Endpoints de la API

Base URL: `/document-settings`

### 1. Crear o actualizar configuración de documentos

Crea una nueva configuración para la fábrica actual, o actualiza una existente. Si se proporciona `userId`, se crea un override para ese usuario; si no, se usa la configuración por defecto de la fábrica.

- **URL**: `POST /document-settings`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`, `OWNER`
- **Body**:

  ```json
  {
    "validityDays": 30,
    "footerText": "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días.",
    "userId": null
  }
  ```

  | Campo          | Tipo             | Descripción                                                                    | Requerido |
  | :------------- | :--------------- | :----------------------------------------------------------------------------- | :-------- |
  | `validityDays` | `number`         | Días de validez del presupuesto (mínimo: 1).                                   | Sí        |
  | `footerText`   | `string`         | Texto del footer del PDF.                                                      | Sí        |
  | `userId`       | `string \| null` | ID del usuario para override. Si se omite, se usa `null` (default de fábrica). | No        |

- **Respuesta** (201 Created):
  ```json
  {
    "_id": "65db...",
    "factoryId": "000000000000000000000000",
    "userId": null,
    "validityDays": 30,
    "footerText": "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días.",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z"
  }
  ```

### 2. Obtener configuración de documentos de la fábrica

Devuelve la configuración de documentos para la fábrica del usuario autenticado. Si el usuario tiene una configuración específica (`userId`), se devuelve esa; de lo contrario, se devuelve la configuración por defecto de la fábrica.

- **URL**: `GET /document-settings`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`, `OWNER`, `SALES`
- **Respuesta** (200 OK):

  ```json
  {
    "_id": "65db...",
    "factoryId": "000000000000000000000000",
    "userId": null,
    "validityDays": 30,
    "footerText": "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días.",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z"
  }
  ```

  > **Nota para Frontend**: Si la respuesta es `null`, significa que no hay configuración creada aún. El frontend debe usar los valores por defecto: `validityDays: 30` y `footerText: "Presupuesto válido por 30 días desde su emisión. Pasado este plazo será necesaria una nueva validación de precios y condiciones. Validez 30 días."`.

### 3. Obtener configuración por ID

Obtiene los detalles de una configuración específica por su ID.

- **URL**: `GET /document-settings/:id`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`, `OWNER`, `SALES`
- **Respuesta** (200 OK):
  ```json
  {
    "_id": "65db...",
    "factoryId": "000000000000000000000000",
    "userId": null,
    "validityDays": 30,
    "footerText": "Presupuesto válido por 30 días desde su emisión...",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-01T10:00:00.000Z"
  }
  ```

### 4. Actualizar configuración

Modifica una configuración existente.

- **URL**: `PATCH /document-settings/:id`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`, `OWNER`
- **Body**:

  ```json
  {
    "validityDays": 45,
    "footerText": "Presupuesto válido por 45 días. Validez 45 días."
  }
  ```

  > **Nota**: Solo se requieren los campos que se desean actualizar.

- **Respuesta** (200 OK):
  ```json
  {
    "_id": "65db...",
    "factoryId": "000000000000000000000000",
    "userId": null,
    "validityDays": 45,
    "footerText": "Presupuesto válido por 45 días. Validez 45 días.",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-05T14:30:00.000Z"
  }
  ```

### 5. Eliminar configuración

Elimina una configuración de documentos. Si se elimina la configuración por defecto (`userId: null`), el sistema usará los valores por defecto hardcoded.

- **URL**: `DELETE /document-settings/:id`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`, `OWNER`
- **Respuesta** (200 OK):
  ```json
  {
    "message": "Configuración eliminada correctamente"
  }
  ```

### 4. Actualizar configuración

Modifica una configuración existente.

- **URL**: `PATCH /document-settings/:id`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`
- **Body**:

  ```json
  {
    "validityDays": 45,
    "footerText": "Presupuesto válido por 45 días. Validez 45 días."
  }
  ```

  > **Nota**: Solo se requieren los campos que se desean actualizar.

- **Respuesta** (200 OK):
  ```json
  {
    "_id": "65db...",
    "factoryId": "000000000000000000000000",
    "userId": null,
    "validityDays": 45,
    "footerText": "Presupuesto válido por 45 días. Validez 45 días.",
    "createdAt": "2024-03-01T10:00:00.000Z",
    "updatedAt": "2024-03-05T14:30:00.000Z"
  }
  ```

### 5. Eliminar configuración

Elimina una configuración de documentos. Si se elimina la configuración por defecto (`userId: null`), el sistema usará los valores por defecto hardcoded.

- **URL**: `DELETE /document-settings/:id`
- **Auth**: Requerido (JWT)
- **Roles**: `ADMIN`
- **Respuesta** (200 OK):
  ```json
  {
    "message": "Configuración eliminada correctamente"
  }
  ```

---

## Manejo de Errores

| Código | Causa                                                                                      |
| :----- | :----------------------------------------------------------------------------------------- |
| `401`  | Token JWT no proporcionado o inválido.                                                     |
| `403`  | El usuario no tiene el rol requerido (`ADMIN`, `OWNER` o `SALES`).                         |
| `404`  | La configuración con el ID especificado no existe o no pertenece a la fábrica del usuario. |
| `400`  | El cuerpo de la solicitud no pasa la validación (ej: `validityDays` menor a 1).            |

---

## Uso desde el Servicio (para otros módulos)

El `DocumentSettingsService` se exporta para que otros módulos puedan acceder a la configuración programáticamente:

```typescript
import { DocumentSettingsService } from "../document-settings/document-settings.service";

// Obtener días de validez
const validityDays = await this.documentSettingsService.getValidityDays(factoryId, userId);

// Obtener texto del footer
const footerText = await this.documentSettingsService.getFooterText(factoryId, userId);
```

> **Nota**: Si no existe configuración para la fábrica/usuario, se devuelven los valores por defecto: `validityDays: 30` y el footer text por defecto.

---

## Integración Frontend Sugerida

1. **Panel de Administración**: Crear una sección en el panel de administración donde el `ADMIN` pueda editar `validityDays` y `footerText` de la fábrica.
2. **Generación de PDF**: Al generar un PDF de presupuesto, el frontend debe consultar `GET /document-settings` para obtener la configuración vigente y aplicar `validityDays` al cálculo de la fecha "Válido hasta" y `footerText` al pie del documento.
3. **Cálculo de fecha de validez**: La fecha "Válido hasta" se calcula sumando `validityDays` a la fecha de generación del presupuesto. Ejemplo: si se genera el 2/3/2026 y `validityDays` es 30, la fecha de validez es 1/4/2026.
4. **Overrides por usuario**: En el futuro, si se necesitan condiciones especiales por comercial, se puede crear una configuración con `userId` específico desde el panel de administración.
