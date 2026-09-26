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

## f. Actualizar react-router-dom/react-router

**Archivos modificados:** `package.json`, `package-lock.json`

**Que se hizo:** `npm audit` reportaba `react-router`/`react-router-dom` en
el rango `>=6.0.0 <7.18.0` (moderado: open redirect via backslash en
`<Link>`/`useNavigate`, y arbitrary constructor injection en
`deserializeErrors()` para SSR -- esto ultimo no aplica, el sitio es una
SPA sin SSR). Se subio `react-router-dom` de `^6.30.6` a `^7.18.4`
(version parcheada; `react-router` se actualiza junto como dependencia
transitiva).

Es un salto de version mayor (v6 -> v7). Se revizo el codigo antes de
subir: solo usa las APIs estables de "library mode" (`BrowserRouter`,
`Routes`, `Route`, `Navigate`, `Link`, `NavLink`, `useNavigate`,
`useParams`, `useLocation`), que React Router mantiene compatibles en
v7, y no hay navegacion relativa (`to=".."`) en ningun `Link`/
`navigate()` del proyecto -- que es lo unico que cambia de
comportamiento por defecto entre v6 y v7 (future flag
`v7_relativeSplatPath`, relevante porque el panel de admin usa rutas
anidadas bajo `/panel-8f3k2qx9/*`).

**Prueba:** `npm audit` ya no reporta `react-router`/`react-router-dom`
(quedan solo vulnerabilidades preexistentes de devDependencies de build
-- eslint, vite, esbuild -- fuera del alcance de este punto).
`npm run typecheck`/`lint`/`build` pasan limpio.

⚠️ **A diferencia de (e), esto SI conviene verificarse visualmente en un
Vercel preview antes de aprobar produccion** (no hace falta una prueba
tipo curl/API como (b)/(c), pero tampoco basta con typecheck/build como
(d)/(e)): aunque el analisis estatico y el build no muestran ningun
problema, es una libreria de enrutamiento -- el navegador ejecuta su
logica de matching de rutas en tiempo real, y typecheck/build no
prueban que cada ruta siga resolviendo al componente correcto en
runtime. Recomendado antes del deploy final: abrir el preview y
click-through rapido por home, una categoria, un articulo, y el panel
de admin (login -> dashboard -> alguna otra seccion) para confirmar
que las rutas siguen funcionando.

**Resultado:** ✅ aplicado y sin vulnerabilidad; pendiente verificacion
visual en preview.

---

## g. Optimizar logo.png y reportar banners sueltos en public/

**Archivo modificado:** `public/logo.png`

**Que se hizo:** el logo se muestra como maximo a 80x80px en la UI
(`AdminLogin.tsx`, `h-20 w-20`); en el resto de usos (header publico,
header admin, favicon) es aun mas chico. El archivo original pesaba
857KB a 1254x1254px -- se descargaba entero en cada carga de pagina para
mostrarse ~15 veces mas chico de lo necesario. Se redimensiono a
256x256px (cubre el uso mas grande a resolucion retina/2x con margen) y
se recomprimio: **857KB -> 55KB (94% mas liviano)**. Misma ruta
(`/logo.png`), ningun cambio de codigo.

**Prueba:** `npm run build` limpio; es un archivo estatico, no afecta
typecheck/lint. Verificacion visual pendiente (que el logo se vea nitido)
-- se puede confirmar junto con el resto del click-through en preview.

**Resultado:** ✅ aplicado.

### Banners sueltos en public/ -- REPORTE (no se eliminaron, solo se
confirma su uso, segun tu instruccion explicita)

Busque cada nombre de archivo en todo `src/`, `index.html`,
`vercel.json` y `supabase/` -- **ninguno de los 4 esta referenciado en
ningun lado del codigo**. El sistema de banners del sitio es dinamico:
se gestiona desde el panel de admin (`BannersManager.tsx`) contra la
tabla `banners` de Supabase, con `imagen_url` apuntando a lo que suba
cada editor -- no a estos archivos fijos en `public/`.

De paso encontre un quinto archivo del mismo patron que tampoco esta
usado: `banner-header-2.png`.

| Archivo | Tamano | ¿En uso? |
|---|---|---|
| `public/banner-header.png` | 1.93 MB | ❌ no referenciado |
| `public/banner-header-2.png` | 65 KB | ❌ no referenciado |
| `public/banner-entre-articulos.png` | 1.82 MB | ❌ no referenciado |
| `public/banner-sidebar.png` | 980 KB | ❌ no referenciado |
| `public/banner-footer.jpg` | 636 KB | ❌ no referenciado |

**Total: ~5.4 MB** de archivos huerfanos que se despliegan igual en
cada build (Vite copia todo `public/` tal cual a `dist/`) y quedan
accesibles publicamente por su URL directa aunque ninguna pagina los
enlace. Quedan **sin tocar** -- si confirmas que no se usan, se pueden
borrar manualmente desde el Finder o con permiso de borrado en este
mismo entorno.

---

## Prueba de click-through en Vercel preview (fix f)

Rama `fix/auditoria-seguridad`, preview de Vercel:
`https://web-de-noticias-rd-git-fix-auditoria-seguridad-aberciord.vercel.app`
(variables de entorno de Production, solo lectura -- Opcion B acordada
con el usuario, sin tocar CSP ni la validacion de keys).

Rutas verificadas manualmente por el usuario:

- `/` (home): carga header, banner, navegacion y seccion de newsletter -- OK.
- `/categoria/entretenimiento`: lista de articulos carga bien -- OK.
- `/farandula`: redirige correctamente a `/categoria/entretenimiento`
  (regla de `vercel.json`) -- OK.
- `/articulo/<id>` (articulo real): abre completo con titulo, fecha,
  imagen, autor y sidebar "Mas leido" -- OK.
- `/panel-8f3k2qx9` (login admin): la pantalla de login carga bien.
  **No se probo el flujo login -> dashboard -> otra seccion** -- el
  usuario decidio no iniciar sesion real durante esta prueba (para no
  interactuar con el panel en un entorno que usa datos/variables de
  produccion). El MFA/2FA de produccion mostro un error aparte
  ("Invalid TOTP code entered") al probarlo por error en el dominio
  real (`elpoderdelpueblord.com`, fuera de esta rama) -- no relacionado
  con los fixes a-g, no se investigo ni se toco nada al respecto.

Conclusion: no se detectaron problemas de enrutamiento tras el salto de
react-router v6 -> v7 en las rutas publicas. La navegacion interna del
panel admin autenticado queda sin verificar visualmente.

---

## Pendiente antes de aprobar produccion

- [x] Verificacion visual de (f) en Vercel preview: home, categoria,
      articulo, redirect `/farandula`, y carga del login admin --
      confirmado sin problemas (ver seccion "Prueba de click-through
      en Vercel preview" arriba). Pendiente: navegacion interna del
      panel admin ya autenticado (dashboard -> otra seccion), no
      probada a proposito en este preview.
- [ ] Verificacion visual de que el logo (256x256) se ve nitido en
      header publico, header admin, login y favicon.
- [ ] Decision tuya sobre los 5 banners huerfanos en `public/`
      (~5.4 MB): borrarlos o dejarlos.
- [ ] El punto 1.1 del informe (arquitectura de comentarios publicos)
      sigue deliberadamente fuera de esta rama -- decision de producto
      aparte.
- [ ] Revision final tuya y aprobacion explicita antes de cualquier
      despliegue a produccion. **No se ha tocado
      `elpoderdelpueblord.com` en ningun momento de este proceso.**

**No se ha desplegado nada a producción. No se ha tocado
`elpoderdelpueblord.com` en ningún momento.**
