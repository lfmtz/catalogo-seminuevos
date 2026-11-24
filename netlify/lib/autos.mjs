// Convierte las filas del Sheet en autos listos para mostrar.
// Las columnas se buscan por NOMBRE de encabezado, así que el orden puede cambiar sin romper nada.

// Marcas con escritura especial (la primera palabra del título es la marca).
const MARCAS_ESPECIALES = {
  ram: "RAM",
  mg: "MG",
  seat: "SEAT",
  cupra: "CUPRA",
  bmw: "BMW",
  gmc: "GMC",
  byd: "BYD",
  jac: "JAC",
  baic: "BAIC",
  gwm: "GWM",
};

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function buscarColumna(encabezados, ...candidatos) {
  const norm = encabezados.map(normalizar);
  for (const c of candidatos) {
    const i = norm.findIndex((h) => h === c || h.startsWith(c));
    if (i !== -1) return i;
  }
  return -1;
}

function numero(v) {
  if (typeof v === "number") return v;
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
}

// Fechas: acepta "2026-11-23", "23/11/2026" o número de serie de Sheets.
function fecha(v) {
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const t = String(v ?? "").trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

function urlFoto(v) {
  const t = String(v ?? "").trim();
  // Solo enlaces https; cualquier otra cosa se descarta.
  if (!/^https:\/\/[^\s"'<>]+$/i.test(t)) return null;

  // Links de Google Drive ("Compartir → Cualquier persona con el enlace") → imagen directa.
  // Acepta .../file/d/ID/view, .../open?id=ID y .../uc?id=ID
  const drive =
    t.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]{10,})/) ||
    t.match(/^https:\/\/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]{10,})/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1600`;
  return t;
}

const verdadero = (v) => ["si", "sí", "true", "1", "x", "verdadero"].includes(normalizar(v));

export function partirTitulo(titulo) {
  const palabras = String(titulo).trim().split(/\s+/);
  const primera = palabras[0] || "";
  const marca =
    MARCAS_ESPECIALES[normalizar(primera)] ||
    primera.charAt(0).toUpperCase() + primera.slice(1).toLowerCase();

  const resto = palabras.slice(1);
  const iAnio = resto.findIndex((p) => /^(19[89]\d|20[0-4]\d)$/.test(p));
  const anio = iAnio === -1 ? null : Number(resto[iAnio]);
  const modelo = (iAnio === -1 ? resto.slice(0, 1) : resto.slice(0, iAnio)).join(" ");
  const version = (iAnio === -1 ? resto.slice(1) : resto.slice(iAnio + 1)).join(" ");
  return { marca, modelo, anio, version };
}

// origen: "agencia" (pestaña de Mercado Libre) o "cliente" (pestaña "Clientes", autos de particulares).
export function filasAAutos(filas, origen = "agencia") {
  if (!filas.length) return [];
  const esCliente = origen === "cliente";
  const enc = filas[0];
  const col = {
    id: buscarColumna(enc, "id publicacion", "id"),
    titulo: buscarColumna(enc, "titulo"),
    precio: buscarColumna(enc, "precio (mxn)", "precio"),
    km: buscarColumna(enc, "km", "kilometraje"),
    estado: buscarColumna(enc, "estado"),
    visto: buscarColumna(enc, "primera vez visto", "primera vez", "fecha de alta", "fecha"),
    anterior: buscarColumna(enc, "precio anterior"),
    bajo: buscarColumna(enc, "bajo de precio", "bajo precio"),
    pago: buscarColumna(enc, "forma de pago", "pago"),
  };
  const colFotos = enc
    .map((h, i) => (/^foto\s*\d+$/.test(normalizar(h)) ? i : -1))
    .filter((i) => i !== -1);

  const autos = [];
  filas.slice(1).forEach((f, fila) => {
    const estado = normalizar(f[col.estado]);
    const titulo = String(f[col.titulo] ?? "").trim();
    if (!titulo) return;
    // Agencia: solo "Activa". Clientes: también se muestra si Estado está vacío
    // (para que Luis solo escriba "Vendida" cuando ya no esté disponible).
    if (!(estado === "activa" || (esCliente && estado === ""))) return;

    const precio = numero(f[col.precio]);
    const anterior = col.anterior !== -1 ? numero(f[col.anterior]) : null;
    const { marca, modelo, anio, version } = partirTitulo(titulo);

    const pagoTexto = col.pago !== -1 ? String(f[col.pago] ?? "").trim() : "";
    autos.push({
      id: esCliente ? `C${fila + 2}` : String(col.id !== -1 && f[col.id] ? f[col.id] : `A${fila + 2}`),
      origen,
      // Particulares: de contado salvo que la columna "Forma de pago" diga otra cosa.
      pago: pagoTexto || (esCliente ? "Contado" : ""),
      titulo,
      marca,
      modelo,
      version,
      anio,
      precio,
      km: col.km !== -1 ? numero(f[col.km]) : null,
      visto: col.visto !== -1 ? fecha(f[col.visto]) : "",
      fila, // sirve para desempatar: lo agregado más abajo en la hoja es más nuevo
      fotos: colFotos.map((i) => urlFoto(f[i])).filter(Boolean).slice(0, 5),
      bajoPrecio:
        (col.bajo !== -1 && verdadero(f[col.bajo])) ||
        (anterior !== null && precio !== null && precio < anterior),
    });
  });
  return autos;
}
