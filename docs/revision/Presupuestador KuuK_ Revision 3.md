# **Presupuestador KuuK: Revisión 3**

Desglose técnico y la documentación detallada dividida en Épicas e Historias de Usuario (US) para que el equipo de desarrollo pueda comenzar a planificar los próximos sprints.

### ---

**ÉPICA 1: Refactorización del Documento PDF**

El diseño actual es bueno, pero requiere ajustes estructurales y de lógica de negocio para adaptarse al flujo de ventas.

**US 1.1: Modificación de la validez del presupuesto en el PDF**

* **Descripción:** Como comercial, necesito que el PDF refleje correctamente la validez del presupuesto para que los clientes tengan clara la fecha límite de la oferta.  
* **Criterios de Aceptación:**  
  * Se debe modificar el cálculo automático de la fecha en la sección "Detalles del documento" para que sume 30 días (+30 días) a la fecha de generación en lugar de los 18 días actuales (+18 días).

  * Si se genera el 2/3/2026, la fecha "Válido hasta" debe indicar 20/3/2026 (o la fecha correspondiente a \+30 días reales).

  * Se debe añadir en el texto del footer (la letra pequeña) que el presupuesto cuenta con un tiempo de validez de 30 días.

  * Es imperativo añadir explícitamente "Validez 30 días" al final del párrafo del footer.

**US 1.2: Reubicación y renombrado del importe total**

* **Descripción:** Como comercial, necesito que el cliente vea el importe en puntos al principio del documento para evitar que pase desapercibido si no lee todas las hojas.

* **Criterios de Aceptación:**  
  * El importe total debe trasladarse desde el final del documento al inicio del PDF.

  * La nueva ubicación debe ser justo debajo de las tarjetas de “datos del cliente” y “detalles del documento”.

  * El texto de la etiqueta debe cambiarse de "IMPORTE TOTAL" a "IMPORTE TOTAL PUNTOS".

  * Esto evitará confusiones con otras monedas como euros o pesetas.

**US 1.3: Introducción manual de la referencia del presupuesto**

* **Descripción:** Como usuario, necesito poder introducir la referencia del presupuesto manualmente para poder vincularla con la solicitud original del cliente.

* **Criterios de Aceptación:**  
  * La referencia en la sección "Detalles del documento" dejará de ser estrictamente automática (ej. 773605CB).

  * El sistema debe permitir la edición/introducción manual de este campo antes de la generación del PDF.

### ---

**ÉPICA 2: Optimización del Flujo del Carrito**

Debemos eliminar la fricción conceptual y técnica en la gestión de proyectos dentro del carrito.

**US 2.1: Actualización de la nomenclatura del módulo**

* **Descripción:** Como usuario, necesito que la interfaz utilice la terminología correcta para evitar confusión sobre el estado del proyecto.  
* **Criterios de Aceptación:**  
  * Se debe reemplazar la palabra “pedido” (o "pedido/s") por “presupuesto” (o "presupuesto/s") en todos los textos de esta sección.

**US 2.2: Nomenclatura personalizada de presupuestos**

* **Descripción:** Como usuario, necesito poder nombrar mis presupuestos para identificarlos rápidamente en la carpeta "mis presupuestos".

* **Criterios de Aceptación:**  
  * Por defecto, el presupuesto debe tomar el nombre del primer elemento del carrito (ej. “REF-0759-ClienteX”) en lugar del formato genérico actual (ej. "ORD-2026-0004").

  * Alternativamente, se debe proporcionar un campo para introducir el nombre manualmente al iniciar el proyecto en el carrito.

**US 2.3: Corrección del flujo de finalización del carrito**

* **Descripción:** Como usuario, necesito que al finalizar un presupuesto, el sistema me redirija correctamente y limpie el carrito para poder iniciar uno nuevo sin mezclar proyectos.

* **Criterios de Aceptación:**  
  * El carrito debe soportar la creación y agrupación de múltiples componentes (ej. una encimera y una isla) en presupuestos separados pero manejables.

  * Al pulsar el botón “finalizar presupuesto” en el carrito, el sistema debe derivar al usuario a la pestaña “mis presupuestos”.

  * El carrito debe quedar vacío/reiniciado tras la finalización para no requerir la eliminación manual de los ítems.

### ---

**ÉPICA 3: Mejoras del Motor del Presupuestador**

Se requieren mejoras en la lógica de configuración de piezas complejas.

**US 3.1: Selección de grupo de material por pieza individual (Paso 2\)**

* **Descripción:** Como usuario, necesito poder asignar diferentes grupos de materiales a distintas piezas de una misma encimera con forma.

* **Criterios de Aceptación:**  
  * Dentro del Paso 2 (forma de las encimeras), en el apartado “Cambiar material de esta pieza”, se debe habilitar un selector para modificar también el "grupo" del material.

  * Esto permitirá combinaciones complejas (ej. Pieza 1 Bäsic HPL 40mm y Pieza 2 Platiniüm HPL 40mm).

  * *Nota de Arquitectura:* La solución más sencilla de cara al usuario es integrarlo directamente en ese apartado; si esto genera deuda técnica o complicaciones en el modelo de datos, se requerirá una reunión técnica para evaluar alternativas.

**US 3.2: Implementación de "Forma Libre" (Paso 2\)**

* **Descripción:** Como usuario, necesito una opción de "forma libre" para configurar pedidos poco comunes que no se ajustan a las plantillas predefinidas.

* **Criterios de Aceptación:**  
  * Se debe añadir una opción de "Forma Libre" en el paso 2\.

  * Al seleccionarla, el usuario debe ver un selector numérico que permita determinar entre 2 y 10 piezas sin una forma gráfica predeterminada.

  * Esta configuración debe ser compatible con el sistema de uniones del Paso 3 (ej. si se seleccionan 4 tableros, el sistema debe solicitar 3 uniones).

  * Debe permitir configurar, por ejemplo, una encimera en U de gran tamaño utilizando 4 tableros en lugar de los 3 habituales.

**US 3.3: Botón de continuidad en el modal de resumen (Paso 5\)**

* **Descripción:** Como usuario, necesito una forma rápida de seguir añadiendo elementos al mismo proyecto sin tener que navegar por menús adicionales.

* **Criterios de Aceptación:**  
  * En el modal que aparece al "añadir al carrito", se debe incluir un botón nuevo llamado “Guardar y continuar proyecto”.

  * Este botón debe situarse debajo del botón actual “Confirmar y guardar”.

  * La acción debe guardar el progreso actual y devolver al usuario al flujo de creación sin obligarle a ir al botón “+” o “Nuevo (Empezar de cero)”.

### ---

**ÉPICA 4: Matriz de Roles y Permisos (RBAC)**

Debemos asegurar que cada perfil acceda estrictamente a la información que le corresponde.

**US 4.1: Parametrización de accesos y visibilidad por Rol**

* **Descripción:** Como administrador del sistema, necesito que los permisos de los diferentes usuarios estén pulidos y limitados según su rol operativo.

* **Criterios de Aceptación:**  
  * **ADMIN:** Debe mantener acceso total a todas las funciones y vistas.

  * **COOP (o WORKER):** Debe tener acceso a todo y ver todos los presupuestos, pero se le debe restringir el acceso a la parametrización.

  * **SALES (Comerciales):** Su acceso al panel debe estar permitido, pero limitado para no ver el paramétrico. Solo deben poder ver sus propios presupuestos y sus propios clientes, no los del resto. Deben poder crear clientes nuevos (estos clientes serán visibles para ADMIN y WORKER, pero invisibles para otros SALES).

  * **USER:** Es el rol más restrictivo. Solo puede ver sus propios presupuestos. No debe ver clientes en el portal ni en el resumen. Se debe verificar que no pueda seleccionar clientes en el carrito ni acceder al panel Admin (actualmente funcional).

  * **Indicadores de Autoría:** ADMIN y WORKER deben poder ver un indicador visual en los presupuestos/clientes de todo el mundo que especifique qué usuario lo creó.

### ---

**ÉPICA 5: UI/UX y Funcionalidades Transversales**

Ajustes generales para mejorar la usabilidad técnica y estética.

**US 5.1: Soporte Multidispositivo (Responsive Design)**

* **Descripción:** Como usuario móvil, necesito poder utilizar la aplicación web desde mi teléfono para generar presupuestos en movilidad.

* **Criterios de Aceptación:**  
  * La aplicación debe ser accesible y funcional en dispositivos móviles.

  * Esta optimización es crítica y debe estar lista para cuando el proyecto se mueva a un servidor estable.

**US 5.2: Corrección del comportamiento del menú lateral**

* **Descripción:** Como usuario del portal, necesito que el menú lateral funcione correctamente y no desaparezca de forma irrecuperable.

* **Criterios de Aceptación:**  
  * Se debe corregir el bug en el menú de fondo oscuro de la izquierda (donde se ubica el carrito, borradores, etc.).

  * La flecha blanca que colapsa el menú debe alternar correctamente entre el estado abierto y cerrado, en lugar de esconder el menú indefinidamente.

**US 5.3: Adjuntos en el proceso de cierre de carrito**

* **Descripción:** Como comercial, necesito poder adjuntar el plano original del cliente al cerrar el presupuesto para tener toda la información centralizada.

* **Criterios de Aceptación:**  
  * Se debe añadir una opción para subir una imagen de un plano en la vista de cerrar el carrito.

  * La imagen servirá para no pedir nueva información al cliente y dejarla registrada junto al presupuesto.

  * La subida de archivos estará limitada estrictamente a formatos de imagen con un peso máximo de 3MB.

  * Esta funcionalidad se activará únicamente cuando el sistema esté desplegado en la URL del dominio final.  
