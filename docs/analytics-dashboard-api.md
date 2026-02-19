# Documentación Técnica: API de Analíticas (Admin Dashboard)

Esta documentación detalla cómo integrar el nuevo endpoint de analíticas en el frontend para construir el panel de control de administración.

## 1. Información del Endpoint

- **Ruta:** `/admin/analytics/summary`
- **Método:** `GET`
- **Autenticación:** Requiere `Bearer Token` (JWT).
- **Permisos:** Solo usuarios con rol `ADMIN`.

---

## 2. Parámetros de Consulta (Query Params)

Todos los parámetros son opcionales. Si no se envían, la API devuelve el resumen histórico completo de órdenes y borradores.

| Parámetro   | Tipo    | Descripción                                                    | Ejemplo                |
| :---------- | :------ | :------------------------------------------------------------- | :--------------------- |
| `startDate` | ISO8601 | Fecha de inicio del filtro.                                    | `2024-01-01T00:00:00Z` |
| `endDate`   | ISO8601 | Fecha de fin del filtro.                                       | `2024-03-31T23:59:59Z` |
| `status`    | Enum    | Filtra la fuente de datos: `order`, `draft` o `all` (default). | `order`                |
| `factoryId` | String  | (Próximamente) Filtro por ID de fábrica.                       | `factory_123`          |

---

## 3. Estructura de la Respuesta (Cuerpo)

La respuesta es un objeto JSON estructurado por secciones para facilitar su vinculación con componentes de UI.

```json
{
  "summary": {
    "totalQuotes": 150, // Conteo total de registros
    "totalPoints": 450000, // Suma total de puntos/precio de todos los proyectos
    "avgPointsPerProject": 3000, // Valor medio: totalPoints / totalQuotes
    "totalSqm": 124.5, // Metros cuadrados totales (suma de todas las piezas)
    "totalMl": 85.2, // Metros lineales de cantos calculados
    "avgPiecesPerProject": 2.3 // Complejidad media (promedio de piezas por presupuesto)
  },
  "charts": {
    "materials": [
      { "id": "DEKTON_ZENITH", "name": "Dekton Zenith", "count": 45, "percentage": 30.5 },
      { "id": "SIL_ARENA", "name": "Silestone Arena", "count": 15, "percentage": 10.2 }
    ],
    "addons": [
      { "code": "SINK_HOLE", "label": "Hueco Fregadero", "count": 120 },
      { "code": "BACKSPLASH", "label": "Copete", "count": 95 }
    ],
    "shapes": [] // (Reservado para futura implementación de agrupación por formas)
  },
  "trends": {
    "dailyQuotes": [
      { "date": "2024-03-01", "count": 5, "points": 12000 },
      { "date": "2024-03-02", "count": 8, "points": 19500 }
    ]
  }
}
```

---

## 4. Guía de Implementación UI (Recomendaciones)

### A. Widgets Superiores (Summary)

Utiliza los campos dentro de `summary` para tarjetas de indicadores KPI.

- **KPI de Valor:** Muestra `totalPoints` con un formato de moneda o puntos.
- **KPI de Volumen:** Muestra `totalQuotes` para ver el tráfico comercial.
- **KPI Operativo:** Muestra `totalSqm` y `totalMl` para previsión de materiales.

### B. Distribución de Materiales (Charts)

Se recomienda un **Gráfico de Tarta (Pie Chart)** o **Donut Chart** utilizando `charts.materials`. Cada entrada incluye el `percentage` ya calculado por el backend para evitar lógica extra en el cliente.

### C. Penetración de Accesorios (Charts)

Se recomienda un **Gráfico de Barras Horizontal** utilizando `charts.addons`, ordenado por el campo `count`. Permite identificar rápidamente cuál es el accesorio más demandado (ej: Huecos de fregadero vs. Copetes).

### D. Gráficos de Evolución (Trends)

Utiliza un **Gráfico de Líneas o Área** para `trends.dailyQuotes`.

- **Eje X:** `date`
- **Eje Y (Serie 1):** `count` (Volumen)
- **Eje Y (Serie 2):** `points` (Valor monetario/puntos)

---

## 5. Manejo de Errores Comunes

| Código             | Error                      | Causa                                                |
| :----------------- | :------------------------- | :--------------------------------------------------- |
| `401 Unauthorized` | Token inválido o expirado. | El usuario debe loguearse de nuevo.                  |
| `403 Forbidden`    | El usuario no es ADMIN.    | Se intenta acceder con un rol de cliente o vendedor. |
| `400 Bad Request`  | Formato de fecha inválido. | El query param no cumple el formato ISO8601.         |

---

### Notas de Performance

La respuesta de este endpoint está sujeta a una **Caché de 15 minutos** en el servidor para evitar degradación de performance ante múltiples visualizaciones simultáneas. Se recomienda no implementar recargas (refetch) automáticas más frecuentes que ese intervalo.
