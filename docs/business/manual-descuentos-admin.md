# Manual Avanzado de Administración: Sistema de Clientes y Reglas de Descuento

Este documento detalla el funcionamiento lógico y técnico de la gestión de clientes y la aplicación de descuentos dinámicos en la plataforma de Presupuestos de Encimeras.

---

## 1. Gestión de Clientes (Customers)

La plataforma segmenta a los clientes para personalizar la experiencia comercial y aplicar políticas de precios específicas.

### Perfiles y Clasificación

- **Tipos de Cliente**: Se diferencia entre **Particulares** y **Empresas** (Business). Cada uno posee campos específicos (NIF/CIF, Nombre Comercial vs. Apellidos, etc.).
- **Estado de Actividad**: Solo los clientes marcados como `Activos` son elegibles para la aplicación de reglas de descuento dinámicas.
- **Perfiles de Descuento/Impuestos**: Cada cliente puede tener asignado un nivel de perfil (ej. "Cliente Oro", "Distribuidor") que el motor utiliza para filtrar reglas exclusivas.

---

## 2. Configuración de Reglas de Descuento

Las reglas de descuento son el núcleo de la estrategia comercial. Se definen mediante tres pilares: **Tipo, Alcance y Condiciones**.

### A. Tipos de Descuento (`Type`)

1.  **Porcentual (%)**: Resta un porcentaje sobre el precio base.
2.  **Importe Fijo (€)**: Resta una cantidad exacta (ej. 50€ de descuento).

### B. Alcance de la Regla (`Scope`)

Define exactamente a ESTO qué se le aplica el descuento:

- **Materiales Específicos**: Se aplica solo a las líneas del presupuesto que contengan materiales seleccionados (ej. "Descuento en Granito Importación").
- **Categorías de Material**: Se aplica a todas las líneas de una categoría (ej. "Campaña Mes del Cuarzo").
- **Total Global**: Se aplica sobre el sumatorio final del presupuesto, una vez calculados todos los ítems.

### C. Estrategia de Cliente (`Customer Strategy`)

Determina quién puede beneficiarse:

- **Global (All)**: Aplica a cualquier presupuesto generado en la fábrica.
- **Clientes Específicos**: Solo se activa si el presupuesto está asociado a un ID de cliente que figure en la "Lista Blanca" de la regla.

---

## 3. Condiciones de Activación

Para que una regla sea procesada por el motor, debe cumplir con:

1.  **Vigencia Temporal**: La fecha actual debe estar dentro del rango `startDate` y `endDate`.
2.  **Valor Mínimo de Pedido**: (Opcional) La regla solo se activa si el importe del presupuesto supera un umbral definido.
3.  **Estado Activo**: La regla debe estar configurada como `isActive: true`.

---

## 4. El Motor de Cálculo (Lógica de Ejecución)

El sistema aplica los descuentos siguiendo un flujo jerárquico para evitar errores de cálculo y garantizar la rentabilidad.

### Paso 1: Filtrado de Reglas

El motor identifica qué reglas son candidatas según la Fábrica, el Cliente seleccionado y la fecha actual.

### Paso 2: Aplicación en Cascada (Orden de Prioridad)

Los descuentos se aplican en el siguiente orden estricto:

1.  **Descuentos por Ítem (Material/Categoría)**:
    - Primero se aplican todos los **Porcentajes** sobre cada línea.
    - Luego se aplican los **Importes Fijos** sobre cada línea.
2.  **Descuentos Globales**:
    - Se calcula el nuevo subtotal del presupuesto.
    - Se aplican las reglas de **Global Total** (primero porcentajes, luego fijos).

### Paso 3: Resolución de Conflictos (`Collision Strategy`)

Si varias reglas aplican al mismo ítem o al total, el sistema utiliza la estrategia definida:

- **SUM**: Se suman los descuentos (ej: 5% + 10% = 15%).
- **MAX**: Solo se aplica el descuento más alto.
- **CASCADE**: Se aplica el segundo descuento sobre el precio ya rebajado por el primero.

---

## 5. Ejemplos Prácticos para Administradores

### Escenario A: Promoción de Material

- **Regla**: 10% de descuento en "Mármol Blanco Carrara".
- **Resultado**: Si el presupuesto tiene 5m² de este mármol a 100€/m² (Total 500€), el motor restará 50€ solo a esa línea. Si hay otros materiales, sus precios no cambian.

### Escenario B: Cupón de Cliente VIP

- **Regla**: 100€ de descuento para el Cliente "Reformas García" en presupuestos > 1.000€.
- **Resultado**: Al seleccionar a este cliente en el carrito, si el total es de 1.200€, el motor restará 100€ al final de todo el proceso.

---

## Notas de Seguridad y Auditoría

- Los descuentos **nunca** pueden resultar en un precio negativo. El sistema truncará el descuento al 100% del valor si fuera necesario.
- Cada presupuesto guardado almacena el `ID` de las reglas aplicadas para permitir trazabilidad histórica en caso de cambios posteriores en la configuración de la regla.
