// Manejo de la sesión: cookie firmada con HMAC.
// El código de acceso y el secreto viven SOLO en variables de entorno de Netlify.
import { createHmac, timingSafeEqual } from "node:crypto";

export const NOMBRE_COOKIE = "sesion_catalogo";
const DURACION_SEG = 60 * 60 * 24 * 30; // 30 días

function secreto() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Falta SESSION_SECRET (mínimo 16 caracteres) en las variables de entorno");
  }
  return s;
}

function firmar(texto) {
  return createHmac("sha256", secreto()).update(texto).digest("base64url");
}

// Comparación en tiempo constante para no filtrar pistas del código por tiempos de respuesta.
export function iguales(a, b) {
  const ha = createHmac("sha256", "cmp").update(String(a)).digest();
  const hb = createHmac("sha256", "cmp").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function codigoValido(codigo) {
  const esperado = process.env.CODIGO_ACCESO;
  if (!esperado) throw new Error("Falta CODIGO_ACCESO en las variables de entorno");
  return typeof codigo === "string" && iguales(codigo.trim(), esperado.trim());
}

export function crearCookie() {
  const expira = Math.floor(Date.now() / 1000) + DURACION_SEG;
  // Se incluye una huella del código: si Luis cambia CODIGO_ACCESO, todas las sesiones viejas caducan.
  const huella = firmar("codigo:" + process.env.CODIGO_ACCESO).slice(0, 10);
  const valor = `${expira}.${huella}`;
  const token = `${valor}.${firmar(valor)}`;
  return `${NOMBRE_COOKIE}=${token}; Path=/; Max-Age=${DURACION_SEG}; HttpOnly; Secure; SameSite=Lax`;
}

export function borrarCookie() {
  return `${NOMBRE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function sesionValida(req) {
  try {
    const cookies = req.headers.get("cookie") || "";
    const par = cookies.split(/;\s*/).find((c) => c.startsWith(NOMBRE_COOKIE + "="));
    if (!par) return false;
    const [expira, huella, firma] = par.slice(NOMBRE_COOKIE.length + 1).split(".");
    if (!expira || !huella || !firma) return false;
    if (!iguales(firma, firmar(`${expira}.${huella}`))) return false;
    if (Number(expira) < Date.now() / 1000) return false;
    return iguales(huella, firmar("codigo:" + process.env.CODIGO_ACCESO).slice(0, 10));
  } catch {
    return false;
  }
}

export function json(datos, status = 200, extra = {}) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      ...extra,
    },
  });
}
