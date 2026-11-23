// Lectura del Google Sheet con una cuenta de servicio (solo lectura).
// Se firma el JWT con node:crypto para no depender de librerías externas.
import { createSign } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function credenciales() {
  // Opción A: pegar el JSON completo de la cuenta de servicio en GOOGLE_SERVICE_ACCOUNT_JSON.
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const c = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return { email: c.client_email, llave: c.private_key };
  }
  // Opción B: correo y llave por separado.
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const llave = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !llave) {
    throw new Error("Faltan las credenciales de Google en las variables de entorno");
  }
  return { email, llave };
}

let tokenCache = { valor: null, expira: 0 };

async function obtenerToken() {
  const ahora = Math.floor(Date.now() / 1000);
  if (tokenCache.valor && tokenCache.expira - 60 > ahora) return tokenCache.valor;

  const { email, llave } = credenciales();
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const encabezado = b64({ alg: "RS256", typ: "JWT" });
  const cuerpo = b64({
    iss: email,
    scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: ahora,
    exp: ahora + 3600,
  });
  const firma = createSign("RSA-SHA256").update(`${encabezado}.${cuerpo}`).sign(llave, "base64url");

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${encabezado}.${cuerpo}.${firma}`,
    }),
  });
  if (!r.ok) throw new Error(`Google rechazó la autenticación (${r.status})`);
  const datos = await r.json();
  tokenCache = { valor: datos.access_token, expira: ahora + (datos.expires_in || 3600) };
  return tokenCache.valor;
}

export async function leerHoja(idHoja, rango) {
  const token = await obtenerToken();
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(idHoja)}` +
    `/values/${encodeURIComponent(rango)}?valueRenderOption=UNFORMATTED_VALUE`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`No se pudo leer la hoja (${r.status})`);
  const datos = await r.json();
  return datos.values || [];
}
