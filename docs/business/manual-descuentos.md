# Manual de Usuario: Sistema de Reglas de Descuento

Este documento explica en detalle cómo configurar, priorizar y combinar las Reglas de Descuento en la plataforma para que los cálculos en los carritos y presupuestos funcionen exactamente como esperas.

---

## 1. Configuración Principal

Estos son los campos obligatorios que dictan el "cuál" y el "cuánto" del descuento.

- **Nombre de la Regla:** Un nombre descriptivo interno. _Ej: "Descuento VIP 2026" o "Campaña Verano - Fregaderos"._
- **Tipo de Descuento:**
  - **Porcentaje (%):** Deduce una fracción del precio. Si el carrito cuesta 1000 pts y el valor es `10`, se descuentan 100 pts.
  - **Monto Fijo (€/pts):** Deduce una cantidad exacta sin importar el volumen. Si el valor es `50`, se descontarán siempre 50 pts netos. (Cuidado de no usar montos fijos muy altos en carritos de menor valor).
- **Valor:** El número a descontar (ej. `15` para un 15%, o `150` para 150 euros/puntos).
- **Alcance (Scope):** **ESTE CAMPO ES FUNDAMENTAL**. Dicta _sobre qué_ se aplica la rebaja:
  - **`Total del Pedido` (GLOBAL_TOTAL):** Evalúa y rebaja la suma de _toda_ la factura (el subtotal completo del Carrito).
  - **`Materiales Específicos` (SPECIFIC_MATERIALS):** Sólo aplica el descuento si el carrito contiene encimeras/piezas fabricadas con los materiales exactos que escojas (ej. Sólo para el material "Dekton Zenith").
  - **`Familias/Categorías` (MATERIAL_CATEGORIES):** Aplica la rebaja sólo a las piezas que pertenezcan a una categoría entera (ej. "Mármol" o "Porcelánico").
- **Prioridad:** El orden de ejecución. **El motor lee las reglas de MAYOR a MENOR número.**
  - _Ejemplo:_ Tienes una regla prioridad `99` y otra prioridad `10`. El sistema primero descontará la de `99`, sacará un subtotal, y luego a ese nuevo subtotal le aplicará la regla `10`.

---

## 2. Condiciones de Activación (Los Filtros)

Estas son las barreras que deciden si un cliente "merece" o "califica" para el descuento.

- **Fecha de Inicio / Fecha Fin:** Para campañas temporales _(Ej: "Black Friday" del 20 al 30 de Noviembre)_. Fuera de esos rangos, la regla es ignorada automáticamente. Deja en blanco si es permanente.
- **Segmentación de Clientes:**
  - **`Todos los Clientes` (ALL):** Se aplica a cualquier presupuesto, incluso si el usuario no ha asignado un cliente final en el carrito.
  - **`Clientes Específicos`:** Abre el campo **"Clientes Seleccionados"** para buscar a dedo empresas o particulares (Ej: Solo aplica a _Damian Vidal_).
  - **`Perfiles de Cliente`:** (Si está habilitado el VIP/Distribuidor) para abarcar a un grupo sin seleccionarlos uno por uno.
- **Importe Mínimo Pedido (€/pts):** El carrito o las piezas deben igualar o superar este monto en bruto. _Ej: "10% de descuento en pedidos superiores a 3000 pts"._ Si no se llega, no se aplica.

---

## 3. Lógica de Aplicación (Cómo interactúan entre ellas)

¿Qué pasa si un cliente cumple los requisitos para 3 reglas distintas a la vez? Aquí configuramos las "Colisiones".

- **Es Acumulable (Stackable - El Switch):**
  - 🟢 **ACTIVO (Sí):** Permite que, después de aplicar esta regla, el sistema siga buscando otras reglas de menor prioridad para aplicar más descuentos.
  - 🔴 **INACTIVO (No):** Hace que esta regla sea "Celosa" (Exclusiva). Si el sistema aplica esta regla, **apaga inmediatamente** el permiso para aplicar cualquier otra regla de menor prioridad que viniera por debajo.
    - _Estrategia:_ Si quieres que la "Tarifa Especial Empleado" sea la única que prime y que no se acumule con la del Black Friday, pon la del Empleado con Prioridad 100 y y hazla No-Acumulable.

---

## 🛠️ Ejemplos Prácticos de Cálculo (Paso a Paso)

Supongamos que el Cliente _Damian_ tiene un presupuesto de **1000 pts**:
Y tenemos dos reglas Activas y Acumulables:

1.  **"Descuento General 16%"** (Prioridad Elevada: `99`) - Aplica a "Todos los Clientes".
2.  **"Descuento Especial Damian 5%"** (Prioridad Baja: `10`) - Aplica a "Damian".

**¿Cómo piensa el Motor del Backend?**

1.  Reúne todas las reglas disponibles y descarta las que no cumplan fechas o cliente. Sobreviven la Regla 1 y Regla 2.
2.  Las ordena de mayor a menor Prioridad: `[Regla 1 (99), Regla 2 (10)]`.
3.  **Procesa Regla 1 (General 16%):** Toma los 1000 pts base. _Descuenta 160 pts_. El nuevo subtotal oculto es **840 pts**.
    - _¿Es Acumulable? Sí._ Sigue bajando a la siguiente regla.
4.  **Procesa Regla 2 (Damian 5%):** **¡OJO AQUÍ!** Ya no toma los 1000 pts iniciales, sino los 840 pts restantes (esto se llama Cascada). Calcula el 5% de 840 pts -> _Descuenta 42 pts_.
    - _¿Es Acumulable? Sí._ Sigue, pero ya no hay más reglas.
5.  **Resultado Final:**
    - Suma de los ahorros: _160 + 42 = 202 pts de Ahorro Total._
    - El carrito se cierra por: _798 pts Finales netos._

### ¿Por qué se calcula en Cascada y NO sumando 16% + 5% = 21% directo?

Por **seguridad financiera**. Sumar de golpe (21% directo de 1000 = 210 pts) puede llevarte a casos absurdos si combinas 4 descuentos. Por ejemplo, si tienes 4 descuentos acumulables del 25%, sumar 25+25+25+25 = 100% te regalaría la cocina. El esquema de "Cascada Progresiva" (sobre saldo restante) protege el margen de tu empresa garantizando que, no importa cuántas reglas acumules, el precio nunca baje a cero o números negativos de forma imprevista.
