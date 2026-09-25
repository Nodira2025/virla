# Virla: equipo, salas y agenda

Implementado el 24/09/2026 en el proyecto autorizado `iiehofyypkmjbcwqnwlg`.
La interfaz todavía no fue publicada. Las tres migraciones sí se aplicaron en Supabase.

## Perfiles

- Personal: consulta salas y agenda; envía pedidos pendientes; ve sus propios pedidos y respuestas.
- Director: crea actividades confirmadas; consulta solicitudes del equipo y las aprueba o rechaza con motivo.
- Admin: funciones de dirección, administración de usuarios y edición de fotos/fichas técnicas.

Registrarse no concede permisos: se crea un perfil inactivo. Solo el admin puede asignar el rol y habilitarlo. A pedido explícito del usuario se crearon y habilitaron las cuentas de prueba `director`, `personal` y `admin`, con identidades técnicas bajo `@pruebas.virla.invalid`. El formulario acepta esos nombres cortos o un correo completo. No se modificaron cuentas existentes. Las contraseñas de prueba están fuera de Git, en `.env.test-users.local`, y fueron entregadas al usuario.

## Base de datos

`202609240001_virla_catalog.sql`: perfiles, funciones de acceso, seis identidades de salas, RLS y bucket `virla-room-photos`.

`202609240002_virla_bookings.sql`: solicitudes/ocupaciones, contactos privados separados, avisos, funciones de creación/aprobación y exclusión de horarios superpuestos. Los intervalos son semiabiertos: 09:00–10:00 y 10:00–11:00 son compatibles. Duración mínima: 30 minutos, dentro del mismo día.

Una solicitud pendiente no ocupa el espacio. La aprobación y la notificación se guardan en la misma transacción. La base vuelve a comprobar capacidad y solapamientos al aprobar. Los usuarios no escriben directamente en las reservas y no pueden asignarse un rol. Los contactos y observaciones no se incluyen en la agenda.

Las salas empiezan con características por confirmar. Las capacidades ficticias del storyboard no se cargaron como datos reales. El admin puede completar los datos técnicos y verificarlos. La validación del formulario y de la base utiliza la capacidad guardada; si no está confirmada, no se inventa un aforo.

## Fotos, voz y avisos

Seis imágenes ilustrativas JPG de 640 × 480 en `public/photos/illustrative-*.jpg`. La interfaz las identifica como ilustraciones. Admin permite reemplazarlas por JPG/PNG/WebP de hasta 5 MB. Las fotos de salas son públicas mediante su URL; las escrituras del bucket requieren admin. No subir imágenes privadas de personas o documentos.

Guía en voz alta y dictado usan las funciones disponibles del navegador, con botones explícitos. Los sonidos son opcionales, se activan por dispositivo y funcionan con la app abierta; no se implementaron notificaciones push con la app cerrada. Avisos por Realtime con consulta de respaldo cada 20 segundos. Agenda se actualiza cada 30 segundos mientras está visible y al volver a la ventana.

## Configuración y publicación pendiente

Copiar `.env.example` a `.env.local` y configurar la URL y clave **publicable**. La configuración local está completa y fuera de Git. Configurar también estas tres variables en el hosting, incluyendo el entorno de Functions si se usa Netlify:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SPACE_CATALOG_BACKEND=supabase
```

No poner claves secretas/service_role en Vite. Al publicar, establecer el dominio final y los redirect URLs autorizados en Supabase Auth. La confirmación de correo debe volver a ese dominio. La antigua escritura `/api/reservations` se cierra cuando el backend está configurado como Supabase; el almacén anterior no se elimina.

Consulta del sitio anterior el 24/09/2026: una reserva histórica, cero futuras. Luego de la autorización del usuario se conservó ese registro, incluido su responsable, en `virla_booking_archive`, protegido por RLS y visible en la agenda para el equipo. Se mantuvieron el ID, los datos y la fecha originales, sin atribuirlo a una cuenta de prueba. El registro del sistema anterior no se borró. EntradaNet sigue visible como fuente externa; los eventos sin una sala vinculada se consultan en «Todas las salas» y no se usan como bloqueo interno automático.

## Validación realizada

- Compilación TypeScript/Vite.
- Pruebas de validación del formulario y contrato del catálogo.
- `scripts/verify-virla-roles.sql` ejecutado contra Supabase en una transacción revertida: personal no aprueba ni escala permisos, solicitudes/contactos aislados, dirección aprueba, avisos emitidos, agenda confirmada visible y solapamientos rechazados.
- Sin cuentas de prueba ni ocupaciones ficticias persistidas.

`scripts/check-test-logins.mjs` verificó por API los tres ingresos, sus roles activos, acceso a seis salas y un registro histórico, y aislamiento de perfiles (admin ve tres; director y personal solo el propio). Cierra las sesiones de prueba al terminar y no imprime tokens ni contraseñas.

Las cuentas compartidas de prueba ya están habilitadas. No se realizó QA de interfaz en navegador ni una publicación en este cambio.
