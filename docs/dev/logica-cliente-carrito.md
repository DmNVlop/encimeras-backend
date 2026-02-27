# Documentación: Selección de Cliente y Descuentos Globales en Carrito

Este documento detalla la implementación técnica de la selección de clientes en el carrito de compras y la estrategia para centralizar la lógica de descuentos a nivel global de pedido.

## 1. Cambios Realizados (Frontend)

### Componentes Actualizados

- **`Cart.tsx`**:
  - Se ha integrado el componente `CustomerSelection`.
  - Se ha modificado la visualización de los ítems para ocultar los descuentos individuales (ahora se muestran como precios brutos).
  - El "Resumen del Pedido" ahora utiliza los campos de descuento global del objeto `Cart`.
- **`CartContext.tsx`**:
  - Nueva función `assignCustomer(customerId)` que notifica al backend el cambio de cliente y refresca el estado del carrito con los nuevos cálculos.
- **`WizardStep5_Summary.tsx` / `BreakdownSection.tsx`**:
  - Se han ocultado los descuentos individuales en la previsualización del presupuesto para fomentar la percepción de ahorro al consolidar el pedido en el carrito.

### Flujo de Usuario

1. El usuario añade uno o varios presupuestos al carrito.
2. Al entrar en el carrito, ve los precios brutos de cada configuración.
3. Al seleccionar un **Cliente**, se dispara una petición al backend.
4. El backend devuelve el carrito recalculado con las reglas de descuento aplicadas al volumen total o al perfil del cliente.
5. El usuario ve el "Ahorro Total" en el resumen lateral.

---

## 2. Propuesta de Mejoras para el Backend (API)

Para que esta funcionalidad sea robusta y escalable, se proponen las siguientes mejoras en la arquitectura del servidor:

### A. Nuevo Endpoint de Asignación de Cliente

**Ruta:** `POST /cart/customer` (o `PUT /cart/customer`)

- **Payload:** `{ customerId: string }`
- **Lógica Interna:**
  1. Validar existencia del cliente.
  2. Vincular el `customerId` a la sesión/entidad del carrito.
  3. Ejecutar el motor de reglas de precio sobre el conjunto total de ítems.
  4. Guardar y devolver el carrito actualizado.

### B. Motor de Reglas Multiescala

Actualmente, las reglas parecen aplicarse ítem por ítem. Se propone que el backend soporte:

- **Reglas de Combinación:** Ejemplo: "Si compras 2 encimeras de más de 3m, descuenta un 5% adicional al total".
- **Reglas de Perfil de Cliente:** Aplicar el `discountProfile` del cliente (`ICustomer.discountProfile`) a la suma total del carrito.
- **Validez de Descuentos:** Asegurar que los descuentos calculados en el carrito se preserven fielmente al convertir el carrito en una `Orden`.

### C. Campos de Auditoría en el Carrito

Añadir campos en el modelo de base de datos del Carrito para rastrear por qué se aplicó un descuento global:

- `appliedGlobalRules`: Array de IDs de reglas aplicadas al carrito completo.
- `manualDiscount`: Soporte para que un administrador pueda aplicar un descuento manual extra en el carrito antes de cerrar el pedido.

---

## 3. Consideraciones Técnicas y Seguridad

- **Consistencia:** Al realizar el `checkout`, el backend debe re-validar que el cliente seleccionado en el carrito sigue siendo válido y que las reglas de descuento no han expirado.
- **Persistencia:** La asignación del cliente debe persistir incluso si el usuario cierra la sesión o refresca la página (ya implementado mediante la llamada al servicio `assignCustomer`).
- **Clean Code:** Se ha mantenido el principio de responsabilidad única, delegando la selección del cliente al componente reutilizable `CustomerSelection`.
