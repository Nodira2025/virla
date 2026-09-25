> Documento histórico del catálogo Netlify. La implementación activa con Supabase, perfiles y fotos editables se describe en [equipo-supabase.md](./equipo-supabase.md).

# Catálogo de salas del Virla

La interfaz consulta `GET /api/spaces`. La función Netlify lee el almacén
`virla-space-profiles`, con una clave `catalog/v1/<id>` por espacio. Los IDs
coinciden con los seis espacios de `src/domain/reservations.ts`.

## Estado de esta implementación

- Recorrido disponible: listado → resumen → ficha técnica completa.
- Las rutas de las fichas sobreviven a recarga y admiten Atrás/Adelante.
- La consulta pública devuelve únicamente campos permitidos por
  `src/domain/spaceCatalog.ts`. No expone contactos ni notas internas.
- La función es de solo lectura. No escribe ejemplos, no migra reservas y
  rechaza POST/PUT/DELETE. La carga o edición administrativa todavía requiere
  integrar autenticación y autorización reales.
- No se cargaron registros ni fotos reales en el almacenamiento remoto.
- Si no hay fichas o falla la consulta, la interfaz muestra los ejemplos
  existentes con una advertencia explícita y distingue vacío de error.
- No se mezclan automáticamente las medidas de los ejemplos con registros
  persistidos. Los campos faltantes se muestran como «Por confirmar».

## Contrato público

Cada registro lleva `schemaVersion: 1`, `id` y `status` (`pending` o `verified`).
Una ficha verificada requiere `verifiedAt` con una fecha válida. El nombre se
obtiene del catálogo existente, no de un texto enviado al endpoint.

Campos opcionales: `capacity`, `summary`, `area`, `dimensions`, `height`,
`layout`, `access`, `equipment` (lista), `uses` (lista), `considerations`,
`photoUrl`, `photoAlt`. `technical` agrupa `stage`, `sound`, `lighting`,
`projection`, `connectivity` y `backstage`.

Las fotografías aceptan HTTPS o rutas locales bajo `/photos/` o `/images/`.
La interfaz muestra «Foto pendiente» si no hay imagen o no puede cargarla.
La capacidad de una ficha no cambia las reglas de validación de reservas;
una modificación de aforo operativo debe coordinarse explícitamente.

## Entorno

Las reservas existentes usan otro almacén: `virla-space-reservations`.
No se encontró integración activa de SQL o de usuarios en el código actual.
Los archivos PostgreSQL en `.netlify/db` no prueban una conexión de la app.

Vite puro sirve la interfaz, pero no ejecuta Netlify Functions. La consulta
del catálogo necesita un entorno con esas funciones disponibles y acceso a
Blobs. El hosting estático descrito en `.openai/hosting.json` por sí solo no
ejecuta estos endpoints. No se realizó una publicación en este cambio.

Validación local del contrato sin tocar datos remotos:
`node scripts/check-space-catalog.mjs`.
