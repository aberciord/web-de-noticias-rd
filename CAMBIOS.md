# CAMBIOS — Auditoría de seguridad (rama `fix/auditoria-seguridad`)

Este documento registra las correcciones aplicadas a partir de `AUDITORIA.md`,
en qué archivos, cómo se probó cada una y qué falta antes de aprobar el
despliegue a producción. Todo el trabajo vive en la rama
`fix/auditoria-seguridad`, nunca en `main`, y no se ha tocado
`elpoderdelpueblord.com` en ningún momento.

**Explícitamente fuera de alcance por ahora:** el punto 1.1 del informe
(arquitectura de comentarios públicos) — es una decisión de producto, se
resuelve aparte.

---

## Estado general de validaciones (después de a, b, c)

Ejecutado sobre la rama, con `npm install` completo:

- `npm run typecheck` → **sin errores**.
- `npm run lint` → **0 errores**, 2 warnings preexistentes y ajenos a estos
  cambios (`react-refresh/only-export-components` en `AuthContext.tsx` y
  `LanguageContext.tsx`).
- `npm run build` → **build exitoso** (Vite, 1655 módulos, sin errores).

---

## a. Backup a Git del código de cookies httpOnly, login y MFA

**Commit:** `f95fbbb`

**Qué se hizo:** la copia de trabajo sin historial de Git
(`~/Desktop/proyectos en claude/web periodico digital`) tenía la
arquitectura de sesión por cookies httpOnly (`api/auth/*`, `api/sb/[...path].ts`,
`api/_lib/session.ts`, `src/lib/adminSupabase.ts`, `src/lib/authApi.ts`,
`vite-api-plugin.ts`, `scripts/mock-supabase.mjs`, etc.) que **no existía**
en el respaldo con historial completo conectado a GitHub. Se incorporó tal
cual a la rama nueva, sin cambiar comportamiento — es respaldo puro.

**Prueba:** ninguna prueba funcional aplica (no cambia lógica); validado por
`npm run build`/`typecheck` exitosos después de la incorporación.

---

## b. Rate limiting en la suscripción al newsletter

**Archivo modificado:** `src/components/public/NewsletterSignup.tsx`
**Commit:** `77b7d83`

**Qué se hizo:** el formulario hacía un `insert` directo a
`newsletter_subscribers` con el cliente público (sin límite de intentos).
Ahora usa `pollApi.subscribe(email)`, que llama a la Edge Function
`poll-actions` (acción `"subscribe"`), la cual ya tenía rate limiting
implementado (10 intentos por IP cada 10 minutos, vía
`check_and_log_poll_attempt`/tabla `poll_action_attempts`) — mismo patrón
reusado, sin tocar `poll-actions/index.ts`. Se agregó manejo de UI para el
estado `rate_limited` (bilingüe ES/EN).

**Prueba funcional (proyecto Supabase de PRUEBA `ouftaqsruulyioqljkwa`,
vacío, nunca el de producción):**
1. Se creó en el proyecto de prueba únicamente lo necesario: tabla
   `newsletter_subscribers`, tabla `poll_action_attempts` y función
   `check_and_log_poll_attempt` (SQL idéntico al de las migraciones
   `20260911160000_create_newsletter_subscribers.sql` y
   `20260924120000_polls.sql`, ejecutado manualmente por el usuario en el
   SQL Editor del proyecto de prueba).
2. Se desplegó ahí la Edge Function `poll-actions` (código idéntico al de
   la rama, sin modificaciones).
3. Se simularon 15 solicitudes seguidas de `subscribe` con emails distintos
   (`prueba-ratelimit-1@example.com` … `-15@example.com`) vía `curl` directo
   contra la función desplegada.

**Resultado:**
- Intentos 1–10: `HTTP 200 {"subscribed":true}`.
- Intentos 11–15: `HTTP 429 {"error":"rate_limited"}` — el bloqueo empezó
  exactamente en el intento #11, como se esperaba (límite = 10).
- Verificado por SQL (`SELECT email FROM newsletter_subscribers WHERE email
  LIKE 'prueba-ratelimit-%@example.com'`) que **solo** las 10 primeras
  quedaron insertadas — las 5 bloqueadas nunca llegaron a la base de datos.

**Resultado:** ✅ funciona como se diseñó.

---

## c. Exigir contraseña actual en `set_own_questions`

**Archivos modificados:** `supabase/functions/manage-editors/index.ts`,
`src/pages/admin/EditorsManager.tsx`
**Commit:** `8cb553b`

**Qué se hizo:** la acción `set_own_questions` (self-service, panel de
editor) aceptaba `new_password` apoyándose solo en la sesión activa, sin
volver a pedir la contraseña vigente. Ahora, si se manda `new_password`,
también es obligatorio `current_password`; se verifica con
`signInWithPassword` usando un cliente Supabase aparte (no toca la sesión
del que llama) y si no coincide se rechaza con `401` antes de tocar nada.
En `EditorsManager.tsx`, el campo de contraseña actual solo aparece (y es
obligatorio) cuando el editor escribe una contraseña nueva.

Se verificó explícitamente que el flujo de "olvidé mi contraseña"
(`AdminLogin.tsx` → `reset-password-questions`) es un flujo **distinto** y
queda fuera de este cambio — ahí no tiene sentido pedir la contraseña
actual porque el usuario no la recuerda.

**Prueba funcional (mismo proyecto Supabase de PRUEBA `ouftaqsruulyioqljkwa`):**
1. Se agregaron al proyecto de prueba las tablas `editors` y
   `editor_security_questions` + la funcion `set_editor_security_questions`
   (SQL identico a `20260910130000_secure_admin_access.sql` y
   `20260916140000_editor_security_questions.sql`).
2. Se creo un usuario de prueba en Authentication -> Users y se inserto su
   fila en `editors`.
3. Se desplego `manage-editors` (codigo identico al de la rama).
4. Se inicio sesion como ese usuario (via el endpoint de password grant) y
   se llamo a `set_own_questions` tres veces:
   - Sin `current_password` (con `new_password` presente): **`HTTP 400`**
     -- `{"error":"Escribe tu contrasena actual para poder cambiarla"}`.
   - Con `current_password` incorrecta: **`HTTP 401`** --
     `{"error":"La contrasena actual no es correcta"}`.
   - Con `current_password` correcta: **`HTTP 200`** -- `{"success":true}`.

**Resultado:** ✅ funciona exactamente como se diseño.

---

## d. Validar host de `fuente_url` en fix-article-images (anti-SSRF)

**Archivo modificado:** `supabase/functions/fix-article-images/index.ts`

**Que se hizo:** `fetchSourceImage()` seguia `fuente_url` (dato en la tabla
`articles`) sin validar el destino antes de hacer `fetch()` desde la Edge
Function (que corre con service role). Se agrego `isSafeExternalUrl()`:
solo permite esquemas `http`/`https`, rechaza `localhost`/`.local`/
`metadata.google.internal`, rechaza IPs literales en rangos privados/
loopback/link-local/CGNAT (incluye `169.254.169.254`, el endpoint de
metadatos de nube), y para hostnames no literales resuelve DNS (A/AAAA) y
valida tambien esas IPs antes de seguir.

**Prueba:** no requiere prueba funcional contra Supabase (no cambia
autenticacion ni datos, solo que URLs se siguen); validado por
`npm run build`/`typecheck`/`lint` (los Edge Functions de Deno no forman
parte del tsconfig del frontend, asi que no los afecta el chequeo de tipos
de la app, pero tampoco rompen nada).

**Resultado:** ✅ aplicado.

---

## e. Restringir CORS de las Edge Functions al dominio real

**Archivos modificados:** `supabase/functions/{fix-article-images,generate-draft,
manage-editors,news-pipeline,poll-actions,reset-password-questions,
search-images}/index.ts`

**Que se hizo:** las 7 Edge Functions que enviaban
`Access-Control-Allow-Origin: "*"` (cualquier sitio podia invocarlas desde
el navegador) ahora responden `Access-Control-Allow-Origin:
"https://elpoderdelpueblord.com"` unicamente. Cambio de un solo valor
literal por archivo, sin tocar logica.

**Prueba:** validado por `npm run typecheck`/`lint`/`build` (limpios) y
confirmado por `grep` que las 7 quedaron con el valor exacto. **No requiere
prueba funcional en vivo** -- ver justificacion abajo.

**Resultado:** ✅ aplicado.

---

## Pendiente (según el orden del informe)

- [ ] f. Actualizar `react-router-dom`/`react-router`
- [ ] g. Optimizar `logo.png` y reportar uso de banners sueltos en `public/`
- [ ] Revisión final del usuario antes de cualquier despliegue a producción

**No se ha desplegado nada a producción. No se ha tocado
`elpoderdelpueblord.com` en ningún momento.**
