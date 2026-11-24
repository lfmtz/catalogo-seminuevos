# Cómo publicar el catálogo en Netlify (paso a paso)

Tiempo aproximado: 20 minutos, una sola vez. Después el catálogo se actualiza solo con lo que tenga el Google Sheet.

## Cómo está armado

```
public/               ← lo único que se publica (página, estilos, robots.txt)
netlify/functions/    ← "servidor": login, autos, salir
netlify/lib/          ← lectura del Sheet y manejo de sesión
netlify.toml          ← configuración de Netlify (publica solo public/)
```

- El navegador **nunca** ve el código de acceso ni las credenciales de Google.
- `/api/login` valida el código y entrega una cookie segura (dura 30 días).
- `/api/autos` lee el Sheet con la cuenta de servicio y devuelve solo los autos `Activa`.
- `admin/`, `server.js` y los `.bat`/`.vbs` siguen en el repo, pero **no se publican**.

---

## Paso 1. Crear la cuenta de servicio de Google (10 min)

1. Entra a <https://console.cloud.google.com/> con tu cuenta de Google.
2. Arriba, en el selector de proyecto → **Proyecto nuevo** → nombre `catalogo-seminuevos` → **Crear**.
3. Menú ☰ → **APIs y servicios** → **Biblioteca** → busca **Google Sheets API** → **Habilitar**.
4. Menú ☰ → **IAM y administración** → **Cuentas de servicio** → **Crear cuenta de servicio**.
   - Nombre: `lector-catalogo` → **Crear y continuar** → (no asignes roles) → **Listo**.
5. Abre la cuenta que creaste → pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → **JSON** → se descarga un archivo `.json`.
   - ⚠️ Ese archivo es una llave: no lo mandes por WhatsApp ni lo subas a GitHub.
6. Copia el correo de la cuenta (algo como `lector-catalogo@catalogo-seminuevos.iam.gserviceaccount.com`).
7. Abre tu Google Sheet → **Compartir** → pega ese correo → permiso **Lector** → desmarca "Notificar" → **Compartir**.

## Paso 2. Conectar el repo a Netlify (5 min)

1. Entra a <https://app.netlify.com/> y crea tu cuenta con GitHub.
2. **Add new site** → **Import an existing project** → **GitHub** → elige `lfmtz/catalogo-seminuevos`.
3. Branch to deploy: la rama que te indique Claude (o `main` cuando ya se haya fusionado).
4. Build command: déjalo **vacío**. Publish directory: `public` (ya viene en `netlify.toml`).
5. **Deploy**.

## Paso 3. Variables de entorno (5 min)

En Netlify: **Site configuration** → **Environment variables** → **Add a variable**.

| Variable | Valor |
|---|---|
| `CODIGO_ACCESO` | (Opcional, solo si `PEDIR_CODIGO=si`) El código para tus clientes |
| `SESSION_SECRET` | Una frase larga al azar (mínimo 16 caracteres), p. ej. `mi-catalogo-secreto-7f3k9q2m` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Abre el `.json` del paso 1 con el Bloc de notas, copia **todo** y pégalo aquí |

Opcionales (ya tienen valor por defecto):

| Variable | Valor por defecto |
|---|---|
| `SHEET_ID` | `16yCHGb2Fn1t0cWDZOZrOQ9xoRavgGV3opocBjbtC0zU` |
| `SHEET_TAB` | `Hoja 1` |

Después: **Deploys** → **Trigger deploy** → **Deploy site** para que tome las variables.

## Paso 4. Probar y compartir

- **Por defecto el catálogo es de acceso libre:** el link abre directo, sin código.
  Sigue oculto de Google (noindex + robots.txt), pero quien tenga el link puede verlo.

  ```
  https://seminuevos-catalogo.netlify.app
  ```

### Si algún día quieres volver a pedir código
1. En Netlify agrega la variable `PEDIR_CODIGO` con valor `si` (además de `CODIGO_ACCESO`).
2. **Deploys** → **Trigger deploy**.
3. Comparte el link con el código incluido para que no lo tengan que teclear:
   `https://seminuevos-catalogo.netlify.app/#codigo=TU_CODIGO`
- El código no distingue mayúsculas/minúsculas. Al cambiar `CODIGO_ACCESO`, las sesiones anteriores se cierran solas.
- Puedes cambiar el nombre del sitio en **Site configuration** → **Change site name**.

---

## La hoja de Google

La app busca las columnas **por nombre de encabezado** (el orden no importa):

| Encabezado | Uso |
|---|---|
| `ID publicación` | Identificador |
| `Título` | Marca (1.ª palabra), modelo, año y versión |
| `Precio (MXN)` | Precio (número) |
| `Km` | Kilometraje (número) |
| `Estado` | Solo se muestran las filas `Activa` |
| `Primera vez visto` | Orden "más recientes" y etiqueta "Recién llegado" |
| `Foto 1` … `Foto 5` | Links `https://` a las fotos (pueden ir vacías) |
| `Precio anterior` *(opcional)* | Si el precio actual es menor, aparece "Bajó de precio" |
| `Bajó de precio` *(opcional)* | `Sí` / `TRUE` también activa la etiqueta |

> Hoy la hoja tiene las columnas A–G. Falta que tu tarea diaria agregue los encabezados
> `Foto 1` … `Foto 5` en H1–L1 y rellene los links. Mientras tanto, cada auto muestra
> "Fotos próximamente".

La app guarda la lectura del Sheet 5 minutos para ir rápido; un cambio en la hoja tarda como máximo eso en verse.

---

## Autos de clientes (particulares, de contado)

Van en la pestaña **`Clientes`** de la misma hoja. La tarea diaria de Mercado Libre solo usa `Hoja 1`, así que no se mezclan.

| Columna | Qué poner |
|---|---|
| `Título` | Igual que en Mercado Libre: **Marca Modelo Año Versión** (ej. `Honda Civic 2019 2.0 Ex Cvt`) |
| `Precio (MXN)` | Solo el número, sin `$` ni comas (ej. `245000`) |
| `Km` | Solo el número |
| `Estado` | Vacío o `Activa` = se muestra · `Vendida` / `Apartada` = no se muestra |
| `Fecha de alta` | `2026-11-24` (sirve para "Más recientes" y "Recién llegado") |
| `Foto 1` … `Foto 5` | Link de Google Drive de cada foto (ver abajo) o cualquier link `https://` de imagen |
| `Forma de pago` | Vacío = **Contado**. Si escribes otra cosa (ej. `Contado o crédito`), eso aparece en la etiqueta |
| `Notas internas` | Datos del dueño, teléfono, etc. **Nunca** salen en el catálogo |

La fila 2 (gris, Estado = `Ejemplo`) es de muestra y no se publica.

### Fotos con Google Drive
1. Crea una carpeta en Drive, p. ej. `Fotos clientes`, y sube las fotos.
2. Clic derecho en la carpeta → **Compartir** → Acceso general: **Cualquier persona con el enlace** → Lector.
3. Abre cada foto → **⋮** → **Compartir** → **Copiar vínculo** y pégalo en `Foto 1`, `Foto 2`…

Los cambios aparecen en el catálogo en máximo 5 minutos.

---

## Varios inventarios de Mercado Libre

- Todos van en `Hoja 1`, con la columna **`Cuenta`** (ej. `Nissan Iztacalco`, `Chevrolet Iztacalco`).
  La referencia del WhatsApp usa la primera letra (N-, C-…); se ajusta en `letraCuenta()` de `netlify/lib/autos.mjs`.
- **Tipo de vehículo** (SUV, Sedán, Hatchback, Pickup, Van) se calcula solo por modelo en `netlify/lib/tipos.mjs`.
  Si un modelo nuevo sale como "Otro", agrégalo a la lista de su tipo en ese archivo.
- El inventario muestra 24 autos y un botón **"Ver más"**.
- Arriba aparecen filas **"Bajaron de precio"** (requiere la columna `Precio anterior`), **"Recién llegados"**
  (según `Primera vez visto`) y **"Menos de $250,000"**. Una fila solo aparece si tiene 2 autos o más.
