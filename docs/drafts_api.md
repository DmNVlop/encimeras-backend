# Documentación Técnica: Módulo de Borradores (Drafts)

Este módulo permite a los usuarios autenticados guardar presupuestos temporales (borradores) para ser recuperados o convertidos en órdenes posteriormente.

## Conceptos Clave

- **Expiración**: Los borradores tienen una fecha de validez configurada en el sistema.
- **Recálculo**: Si un borrador expira, al recuperarlo el sistema recalcula automáticamente el precio con las tarifas actuales, devolviendo un estado `EXPIRED_RECALCULATED`.
- **Propiedad**: Solo el usuario que creó el borrador puede visualizarlo, editarlo o eliminarlo.

---

## Modelo de Datos (Draft)

| Campo                | Tipo                | Descripción                                                 |
| :------------------- | :------------------ | :---------------------------------------------------------- |
| `_id`                | `ObjectId`          | Identificador único del borrador.                           |
| `name`               | `string` (opcional) | Nombre personalizado asignado por el usuario.               |
| `userId`             | `string`            | ID del usuario propietario.                                 |
| `userEmail`          | `string`            | Email para contacto/recuperación rápida.                    |
| `configuration`      | `Object`            | Estado completo del presupuesto (materiales, piezas, etc).  |
| `currentPricePoints` | `number`            | Precio calculado al momento de guardar.                     |
| `expirationDate`     | `Date`              | Fecha límite de validez del presupuesto.                    |
| `isConverted`        | `boolean`           | Indica si el borrador ya se convirtió en pedido.            |
| `cartGroupId`        | `string` (opcional) | ID de agrupación para múltiples presupuestos en un carrito. |

---

## Endpoints de la API

Base URL: `/drafts`

### 1. Obtener todos los borradores activos

Devuelve la lista de borradores no convertidos del usuario autenticado.

- **URL**: `GET /drafts`
- **Auth**: Requerido (JWT)
- **Respuesta**: `Draft[]`

### 2. Guardar un nuevo borrador

Crea un nuevo borrador con la configuración actual.

- **URL**: `POST /drafts`
- **Auth**: Requerido (JWT)
- **Body**:
  ```json
  {
    "name": "Presupuesto Cocina XL",
    "userEmail": "usuario@ejemplo.com",
    "configuration": {
      "wizardTempMaterial": { ... },
      "mainPieces": [ ... ]
    },
    "currentPricePoints": 1250.50
  }
  ```
- **Respuesta** (201 Created):
  ```json
  {
    "message": "Borrador guardado correctamente",
    "id": "65db...",
    "expirationDate": "2024-03-24T..."
  }
  ```

### 3. Recuperar un borrador por ID

Obtiene los detalles de un borrador específico. Maneja la lógica de expiración.

- **URL**: `GET /drafts/:id`
- **Auth**: Requerido (JWT)
- **Respuesta** (200 OK):
  ```json
  {
    "status": "VALID", // o "EXPIRED_RECALCULATED"
    "message": "Borrador recuperado",
    "data": { ... }, // Objeto Draft completo
    "newPrice": null // Solo tendrá valor si status es EXPIRED_RECALCULATED
  }
  ```
  > **Nota para Frontend**: Si el `status` es `EXPIRED_RECALCULATED`, se debe mostrar un aviso al usuario indicando que los precios han sido actualizados a la tarifa vigente.

### 4. Actualizar un borrador

Modifica un borrador existente y renueva su fecha de expiración.

- **URL**: `PUT /drafts/:id`
- **Auth**: Requerido (JWT)
- **Body**: (Mismo formato que el POST)
- **Respuesta** (200 OK):
  ```json
  {
    "message": "Borrador actualizado con éxito",
    "id": "65db...",
    "expirationDate": "2024-03-25T..."
  }
  ```

### 5. Eliminar un borrador

- **URL**: `DELETE /drafts/:id`
- **Auth**: Requerido (JWT)
- **Respuesta** (200 OK):
  ```json
  {
    "message": "Borrador eliminado correctamente"
  }
  ```

---

## Integración Frontend Sugerida

1. **Guardado**: Ofrecer al usuario un campo de texto opcional para nombrar su presupuesto antes de hacer el POST a `/drafts`.
2. **Listado**: En el área de usuario, mostrar la lista de borradores con su nombre y fecha de expiración.
3. **Carga**: Al seleccionar un borrador, navegar a `/drafts/:id`. Si la respuesta contiene `EXPIRED_RECALCULATED`, notificar al usuario el cambio de precio mediante un Toast o Banner informativo.
4. **Grupos**: Si el borrador cargado tiene un `cartGroupId`, sugerir al usuario cargar el resto de elementos del conjunto para completar el proyecto.
