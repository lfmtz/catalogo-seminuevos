// Lectura del Google Sheet con una cuenta de servicio (solo lectura).
// Se firma el JWT con node:crypto para no depender de librerías externas.
import { createSign } from "node:crypto";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function credenciales() {
  // Opción A: pegar el JSON completo de la cuenta de servicio en GOOGLE_SERVICE_ACCOUNT_JSON.
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    let c;
    try {
      // Se quitan espacios, BOM o comillas sobrantes que a veces se cuelan al copiar y pegar.
      const texto = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim().replace(/^﻿/, "").replace(/^'|'$/g, "");
      c = JSON.parse(texto);
    } catch {
      throw new ErrorCatalogo("json_invalido", "GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido (¿se pegó completo, de { a }?)");
    }
    if (!c.client_email || !c.private_key) {
      throw new ErrorCatalogo("json_incompleto", "Al JSON le falta client_email o private_key");
    }
    return { email: c.client_email, llave: c.private_key.replace(/\\n/g, "\n") };
  }
  // Opción B: correo y llave por separado.
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const llave = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!email || !llave) {
    throw new ErrorCatalogo("sin_credenciales", "Faltan las credenciales de Google en las variables de entorno");
  }
  return { email, llave };
}

// Error con un código corto (sin datos sensibles) que se puede mostrar en la página para diagnosticar.
export class ErrorCatalogo extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// Extrae el mensaje de error que manda Google, para que quede en los registros de Netlify.
async function detalleGoogle(r) {
  try {
    const d = await r.json();
    return d.error_description || d.error?.message || JSON.stringify(d.error || d);
  } catch {
    return "";
  }
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
  let firma;
  try {
    firma = createSign("RSA-SHA256").update(`${encabezado}.${cuerpo}`).sign(llave, "base64url");
  } catch {
    throw new ErrorCatalogo("llave_invalida", "La private_key del JSON no es válida (¿se cortó al pegarla?)");
  }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${encabezado}.${cuerpo}.${firma}`,
    }),
  });
  if (!r.ok) {
    throw new ErrorCatalogo(`auth_${r.status}`, `Google rechazó la autenticación (${r.status}): ${await detalleGoogle(r)}`);
  }
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
  if (!r.ok) {
    // 403 = la API no está habilitada o la hoja no se compartió con la cuenta de servicio
    // 404 = ID de hoja incorrecto · 400 = nombre de pestaña incorrecto
    throw new ErrorCatalogo(`hoja_${r.status}`, `No se pudo leer la hoja (${r.status}): ${await detalleGoogle(r)}`);
  }
  const datos = await r.json();
  return datos.values || [];
}
