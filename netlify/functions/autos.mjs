// GET /api/autos → lista de autos activos.
// Por defecto el catálogo es de acceso libre (el link abre directo).
// Para volver a pedir código: en Netlify, variable PEDIR_CODIGO = si (y CODIGO_ACCESO con el código).
import { sesionValida, json } from "../lib/sesion.mjs";
import { leerHoja } from "../lib/google.mjs";
import { filasAAutos, letrasDeCuentas } from "../lib/autos.mjs";

const ID_HOJA_DEFAULT = "16yCHGb2Fn1t0cWDZOZrOQ9xoRavgGV3opocBjbtC0zU";
const CACHE_MS = 5 * 60 * 1000; // la hoja cambia una vez al día; 5 min de caché basta

let cache = { autos: null, hora: 0 };

const pideCodigo = () => ["si", "sí", "true", "1"].includes(String(process.env.PEDIR_CODIGO || "").trim().toLowerCase());

export default async (req) => {
  const conCodigo = pideCodigo();
  if (conCodigo && !sesionValida(req)) return json({ error: "Necesitas el código de acceso" }, 401);

  try {
    if (!cache.autos || Date.now() - cache.hora > CACHE_MS) {
      const idHoja = process.env.SHEET_ID || ID_HOJA_DEFAULT;
      const pestanaClientes = process.env.SHEET_TAB_CLIENTES || "Clientes";
      const opcional = (rango) =>
        leerHoja(idHoja, rango).catch((e) => {
          console.warn(`Rango "${rango}" no disponible:`, e.message);
          return [];
        });
      const [agencia, clientes, cuentas] = await Promise.all([
        // Pestaña de Mercado Libre (obligatoria)
        leerHoja(idHoja, `${process.env.SHEET_TAB || "Hoja 1"}!A1:Z500`),
        // Pestaña de autos de clientes (opcional: si no existe, se ignora)
        opcional(`${pestanaClientes}!A1:Z300`),
        // Pestaña de cuentas de agencia y su letra para el WhatsApp (opcional)
        opcional("Cuentas!A1:G50"),
      ]);
      const letras = letrasDeCuentas(cuentas);
      cache = {
        autos: [...filasAAutos(agencia, "agencia", letras), ...filasAAutos(clientes, "cliente")],
        hora: Date.now(),
      };
    }
    // Quitamos el campo interno "fila" antes de mandarlo al navegador.
    const autos = cache.autos.map(({ fila, ...a }) => ({ ...a, orden: fila }));
    const cuerpo = { autos, actualizado: new Date(cache.hora).toISOString(), conCodigo };
    if (conCodigo) return json(cuerpo); // con código: cada respuesta es privada, sin caché

    // Acceso libre: la respuesta es igual para todos → la guarda la red de Netlify (CDN).
    // 5 min "fresca"; después se sirve la copia guardada al instante mientras se renueva en segundo plano.
    // Así casi ningún cliente espera a que se lea Google Sheets.
    return json(cuerpo, 200, {
      "Cache-Control": "public, max-age=60",
      "Netlify-CDN-Cache-Control": "public, durable, s-maxage=300, stale-while-revalidate=86400",
    });
  } catch (e) {
    console.error(e);
    // El código corto ayuda a diagnosticar sin exponer datos sensibles.
    return json({ error: "No se pudo cargar el inventario", codigo: e.codigo || "desconocido" }, 502);
  }
};

export const config = { path: "/api/autos" };
