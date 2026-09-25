# Bienvenida, perfil y dictado guiado — 24/09/2026

## Recorrido
- La landing institucional pública se mantiene en la raíz.
- Acceso del equipo abre #inicio: bienvenida privada con fachada adjunta por el usuario, saludo, perfil, reloj y próximas ocupaciones confirmadas de Supabase.
- Iniciar lleva a #menu. Mi perfil abre #perfil, también accesible desde el menú y la barra del equipo.
- Clima de Tucumán con coordenadas fijas (sin geolocalización), consulta Open-Meteo; muestra indisponibilidad si falla. Los widgets no usan datos ficticios del mockup. Fuente API: https://open-meteo.com/en/docs

## Perfil personal
- Identidad y permisos permanecen en Supabase: getUser valida el JWT y virla_role exige cuenta activa.
- Nombre, contacto, sector y retrato se guardan de forma privada en Netlify Blobs, almacén virla-personal-profiles, clave members/{UUID validado}. GET/PUT /api/profile nunca acepta un ID elegido por el cliente. No se modifica el esquema ni los roles existentes de Supabase.
- La foto se reduce en el navegador a JPG 320×320 y se almacena con el perfil; no se publica en una URL abierta ni se agrega al JWT. Se admite reemplazarla o quitarla.
- Se reutilizan los datos al crear solicitudes; no se modifican retrospectivamente reservas existentes.
- Vite redirige únicamente /api/profile al servidor publicado para pruebas con la sesión del usuario. Las modificaciones desde desarrollo son reales en ese perfil.

## Dictado
- Ventana modal nativa, foco contenido y cierre con Escape. El micrófono solo se activa con Tocar y hablar y se aborta al cerrar.
- Frase completa con fecha, horas, sala y evento. Reconoce números escritos/hablados, fechas numéricas y relativas hoy/mañana/pasado mañana.
- Datos ambiguos o ausentes se eligen en listas. Se pide hora final, no se asume una duración. Horas ambiguas AM/PM requieren revisión.
- Nombre/contacto del perfil, nunca permisos o identidad de acceso a partir de la transcripción.
- Permite dictar solo el nombre del evento, seleccionar tipo/categoría y revisar. La confirmación final sigue usando validación y RPC existente; personal envía a dirección, director/admin confirma.
- Dependencia del soporte y permiso de SpeechRecognition del navegador; formulario disponible como alternativa. No se ha probado con un micrófono físico en esta sesión.

## Verificación
- scripts/check-welcome-profile-voice.mjs prueba interpretación, fechas inválidas, campos ausentes y aislamiento del endpoint con dobles de prueba.
- Compilación TypeScript/Vite y comprobación TypeScript de la función.
- Se mantienen las comprobaciones de reservas y catálogo existentes.
- Verificación publicada: GET anónimo devuelve 401; la cuenta personal de prueba guardó y recuperó datos/foto correctamente. Se restauró su foto anterior y se comprobó que conserva el rol staff. Si no tenía perfil, la prueba inicializa únicamente nombre/correo de esa cuenta ficticia ya existente.
- Script reproducible: scripts/verify-profile-live.mjs. Modifica temporalmente solo el perfil de personal@pruebas.virla.invalid y restaura la foto; requiere las credenciales locales ignoradas por Git.
