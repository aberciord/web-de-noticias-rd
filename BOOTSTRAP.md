# Bootstrap: crear el primer acceso al panel

El panel admin (`/panel-8f3k2qx9`) no tiene registro público. El acceso se
controla por una tabla `editors` que solo se puede escribir con la
service role key (Dashboard de Supabase), nunca desde la app. Una vez que
existe al menos un editor, ese editor puede crear a los demás desde
**Editores** dentro del panel — este procedimiento manual solo hace falta
**una vez**, cuando la tabla `editors` está vacía (instalación nueva).

## Pasos

### 1. Crear el usuario en Supabase Auth

Dashboard del proyecto → **Authentication** → **Users** → **Add user** →
**Create new user**.

- Email: el correo del primer editor.
- Password: una contraseña temporal (el editor la puede cambiar después
  desde el panel, en Editores → "Mis preguntas de seguridad").
- Marca **Auto Confirm User** para que pueda iniciar sesión de inmediato,
  sin flujo de verificación por correo.

Al crearlo, copia el **UUID** del usuario (columna `UID` en la lista de
Users, o en el detalle del usuario que acabas de crear).

### 2. Darle acceso al panel (tabla `editors`)

Dashboard del proyecto → **SQL Editor** → pega y corre:

```sql
insert into editors (id, email)
values ('UUID-COPIADO-EN-EL-PASO-1', 'correo-del-editor@ejemplo.com');
```

Sin esta fila, el login funciona pero `ProtectedRoute` lo redirige de
vuelta afuera del panel (no está en el allowlist).

### 3. Iniciar sesión y activar el 2FA

- Entra a `/panel-8f3k2qx9` con ese correo y contraseña.
- El 2FA es obligatorio: la primera vez te redirige solo a
  **Seguridad (2FA)**. Escanea el QR con Google Authenticator/Authy y
  verifica el código de 6 dígitos.
- Ya con eso, el editor tiene acceso completo al panel.

### 4. (Opcional) Preguntas de seguridad

En **Editores** → "Mis preguntas de seguridad", el propio editor puede
guardar sus 2 preguntas/respuestas para poder recuperar la contraseña
después, y cambiarla si quiere.

## A partir de aquí

Con el primer editor ya activo, **no vuelvas a repetir este proceso**:
cualquier editor con sesión iniciada puede crear a los siguientes desde
**Editores** → "Nuevo editor" dentro del panel, sin tocar el Dashboard de
Supabase.
