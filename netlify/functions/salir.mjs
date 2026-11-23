// POST /api/salir → borra la cookie de sesión.
import { borrarCookie, json } from "../lib/sesion.mjs";

export default async () => json({ ok: true }, 200, { "Set-Cookie": borrarCookie() });

export const config = { path: "/api/salir" };
