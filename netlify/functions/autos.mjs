// GET /api/autos → lista de autos activos, solo si hay sesión válida.
import { sesionValida, json } from "../lib/sesion.mjs";
import { leerHoja } from "../lib/google.mjs";
import { filasAAutos } from "../lib/autos.mjs";

const ID_HOJA_DEFAULT = "16yCHGb2Fn1t0cWDZOZrOQ9xoRavgGV3opocBjbtC0zU";
const CACHE_MS = 5 * 60 * 1000; // la hoja cambia una vez al día; 5 min de caché basta

let cache = { autos: null, hora: 0 };

export default async (req) => {
  if (!sesionValida(req)) return json({ error: "Necesitas el código de acceso" }, 401);

  try {
    if (!cache.autos || Date.now() - cache.hora > CACHE_MS) {
      const filas = await leerHoja(
        process.env.SHEET_ID || ID_HOJA_DEFAULT,
        `${process.env.SHEET_TAB || "Hoja 1"}!A1:Z500`
      );
      cache = { autos: filasAAutos(filas), hora: Date.now() };
    }
    // Quitamos el campo interno "fila" antes de mandarlo al navegador.
    const autos = cache.autos.map(({ fila, ...a }) => ({ ...a, orden: fila }));
    return json({ autos, actualizado: new Date(cache.hora).toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo cargar el inventario" }, 502);
  }
};

export const config = { path: "/api/autos" };
