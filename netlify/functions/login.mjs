// POST /api/login  { codigo }  → cookie de sesión si el código es correcto.
import { codigoValido, crearCookie, json } from "../lib/sesion.mjs";

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let codigo = "";
  try {
    ({ codigo } = await req.json());
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }

  try {
    if (!codigoValido(codigo)) {
      await pausa(900); // frena intentos de adivinar el código
      return json({ error: "Código incorrecto" }, 401);
    }
    return json({ ok: true }, 200, { "Set-Cookie": crearCookie() });
  } catch (e) {
    console.error(e);
    return json({ error: "El catálogo no está configurado todavía" }, 500);
  }
};

export const config = { path: "/api/login" };
