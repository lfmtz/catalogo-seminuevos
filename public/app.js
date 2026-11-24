// Catálogo Seminuevos — lógica del navegador.
// Aquí NO hay códigos ni credenciales: todo se valida en las funciones de Netlify (/api/*).
"use strict";

const WHATSAPP = "525521787900";
const MSG_GENERAL = "Hola Luis, vi tu catálogo de seminuevos y quiero información.";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const fmtPrecio = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat("es-MX");
const precioTxt = (n) => fmtPrecio.format(n).replace(/\s?MXN/, "").replace("MX", "");
const waLink = (texto) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

const estado = { autos: [], texto: "", marca: "", precio: "", orden: "recientes" };

// ------------------------------------------------------------------
// Arranque
// ------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  $$(".js-wa-general").forEach((a) => (a.href = waLink(MSG_GENERAL)));
  $("#form-acceso").addEventListener("submit", alEnviarCodigo);
  $("#btn-salir").addEventListener("click", salir);

  // Link con el código incluido. Se aceptan varias formas para que nadie batalle:
  //   https://.../#codigo=XXXX  (recomendada: lo que va después de # no viaja al servidor)
  //   https://.../#c=XXXX   ·   https://.../?codigo=XXXX   ·   https://.../?c=XXXX
  const codigoLink = leerCodigoDelLink();
  if (codigoLink) {
    // Se borra el código de la barra de direcciones en cuanto se lee.
    history.replaceState(null, "", location.pathname);
    const ok = await entrar(codigoLink, { silencioso: true });
    if (ok) return;
    // El código del link no sirvió (p. ej. Luis lo cambió). Si el teléfono ya tenía sesión, entra igual;
    // si no, se muestra la pantalla de acceso con un aviso claro.
    const r = await fetch("/api/autos", { credentials: "same-origin" }).catch(() => null);
    if (r && r.ok) return cargarCatalogo();
    mostrarAcceso();
    errorAcceso("Este link ya no es válido. Escribe el código o pídele a Luis un link nuevo.");
    return;
  }
  cargarCatalogo();
});

function leerCodigoDelLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const crudo = params.get("codigo") || params.get("c") || query.get("codigo") || query.get("c") || "";
  // Quita espacios y signos que a veces se pegan al final al copiar el link de un mensaje.
  return crudo.trim().replace(/[.,;:!?)\]}>"'»]+$/, "");
}

// Recordamos (solo como pista visual) si este teléfono ya entró antes,
// para mostrar el esqueleto del catálogo en vez de un parpadeo de la pantalla de acceso.
const yaEntro = {
  get: () => { try { return localStorage.getItem("ya_entro") === "1"; } catch { return false; } },
  set: (v) => { try { v ? localStorage.setItem("ya_entro", "1") : localStorage.removeItem("ya_entro"); } catch {} },
};

async function cargarCatalogo() {
  if (yaEntro.get()) { mostrarCatalogo(); pintarEsqueletos(); }
  try {
    const r = await fetch("/api/autos", { credentials: "same-origin" });
    if (r.status === 401) { yaEntro.set(false); return mostrarAcceso(); }
    yaEntro.set(true);
    mostrarCatalogo();
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.codigo || "HTTP " + r.status);
    }
    const datos = await r.json();
    estado.autos = prepararAutos(datos.autos || []);
    pintarFecha(datos.actualizado);
    iniciarFiltros();
    pintarPortada();
    aplicar();
  } catch (e) {
    console.error(e);
    mostrarCatalogo();
    $("#rejilla").innerHTML = "";
    $("#rejilla").append(vacio(`No pudimos cargar el inventario. Intenta de nuevo en un momento. (código: ${e.message})`, "Reintentar", cargarCatalogo));
  }
}

function mostrarAcceso() {
  $("#vista-catalogo").hidden = true;
  $("#vista-acceso").hidden = false;
  setTimeout(() => $("#codigo").focus(), 50);
}
function mostrarCatalogo() {
  $("#vista-acceso").hidden = true;
  $("#vista-catalogo").hidden = false;
}

// ------------------------------------------------------------------
// Acceso
// ------------------------------------------------------------------
// silencioso: true → si falla, no muestra nada (lo decide quien llama; se usa con el link).
async function entrar(codigo, { silencioso = false } = {}) {
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ codigo }),
    });
    if (r.ok) {
      cargarCatalogo();
      return true;
    }
    if (silencioso) return false;
    const d = await r.json().catch(() => ({}));
    errorAcceso(d.error || "No se pudo entrar");
  } catch {
    if (silencioso) return false;
    errorAcceso("Sin conexión. Revisa tu internet.");
  }
  mostrarAcceso();
  return false;
}

async function alEnviarCodigo(ev) {
  ev.preventDefault();
  const btn = ev.submitter || $("button", ev.target);
  btn.disabled = true;
  errorAcceso("");
  await entrar($("#codigo").value);
  btn.disabled = false;
}

function errorAcceso(msg) {
  $("#acceso-error").textContent = msg;
  if (msg) {
    const t = $("#form-acceso");
    t.classList.remove("temblor");
    void t.offsetWidth; // reinicia la animación
    t.classList.add("temblor");
  }
}

async function salir() {
  yaEntro.set(false);
  await fetch("/api/salir", { method: "POST", credentials: "same-origin" }).catch(() => {});
  location.reload();
}

// ------------------------------------------------------------------
// Datos
// ------------------------------------------------------------------
function prepararAutos(autos) {
  const fechas = autos.map((a) => a.visto).filter(Boolean).sort();
  const min = fechas[0], max = fechas[fechas.length - 1];
  return autos.map((a) => ({
    ...a,
    // "Recién llegado" solo si hay autos de fechas distintas (en la primera carga todos son del mismo día)
    nuevo: Boolean(a.visto && min !== max && a.visto === max),
    buscable: normalizar(`${a.titulo} ${a.marca} ${a.anio ?? ""}`),
  }));
}

const normalizar = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function filtrar() {
  const palabras = normalizar(estado.texto).split(/\s+/).filter(Boolean);
  const [pMin, pMax] = estado.precio ? estado.precio.split("-").map((v) => (v === "" ? null : Number(v))) : [null, null];
  return estado.autos.filter((a) => {
    if (estado.marca && a.marca !== estado.marca) return false;
    if (pMin !== null && (a.precio ?? 0) < pMin) return false;
    if (pMax !== null && (a.precio ?? 0) > pMax) return false;
    return palabras.every((p) => a.buscable.includes(p));
  });
}

function ordenar(lista) {
  const l = [...lista];
  const porFecha = (a, b) => (b.visto || "").localeCompare(a.visto || "") || b.orden - a.orden;
  switch (estado.orden) {
    case "precio-asc": return l.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
    case "precio-desc": return l.sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0));
    case "anio-desc": return l.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0) || porFecha(a, b));
    default: return l.sort(porFecha);
  }
}

// ------------------------------------------------------------------
// Filtros
// ------------------------------------------------------------------
let filtrosListos = false;
function iniciarFiltros() {
  // Marcas en orden alfabético con su conteo
  const conteo = {};
  estado.autos.forEach((a) => (conteo[a.marca] = (conteo[a.marca] || 0) + 1));
  const marcas = Object.keys(conteo).sort((a, b) => a.localeCompare(b, "es"));
  const sel = $("#f-marca");
  sel.length = 1;
  marcas.forEach((m) => sel.add(new Option(`${m} (${conteo[m]})`, m)));

  // Chips con las 4 marcas con más autos
  const chips = $("#chips-marcas");
  chips.innerHTML = "";
  Object.entries(conteo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .forEach(([m]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = m;
      b.dataset.marca = m;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        estado.marca = estado.marca === m ? "" : m;
        $("#f-marca").value = estado.marca;
        aplicar();
      });
      chips.append(b);
    });

  if (filtrosListos) return;
  filtrosListos = true;

  $("#f-texto").addEventListener("input", (e) => { estado.texto = e.target.value; aplicar(); });
  $("#f-marca").addEventListener("change", (e) => { estado.marca = e.target.value; aplicar(); });
  $("#f-precio").addEventListener("change", (e) => { estado.precio = e.target.value; aplicar(); });
  $("#f-orden").addEventListener("change", (e) => { estado.orden = e.target.value; aplicar(); });
  $("#buscador").addEventListener("submit", (e) => {
    e.preventDefault();
    document.activeElement?.blur(); // cierra el teclado en el celular
    $("#inventario").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
}

function aplicar() {
  const lista = ordenar(filtrar());
  pintarRejilla(lista);

  const total = estado.autos.length;
  $("#resumen").textContent =
    lista.length === total ? `${total} autos listos para entrega` : `${lista.length} de ${total} autos coinciden`;
  $("#btn-buscar-texto").textContent = lista.length === 1 ? "Ver 1 auto" : `Ver ${lista.length} autos`;
  $$("#chips-marcas .chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.marca === estado.marca)));
  pintarFiltrosActivos();
}

function pintarFiltrosActivos() {
  const cont = $("#filtros-activos");
  cont.innerHTML = "";
  const activos = [];
  if (estado.texto.trim()) activos.push([`“${estado.texto.trim()}”`, () => { estado.texto = ""; $("#f-texto").value = ""; }]);
  if (estado.marca) activos.push([estado.marca, () => { estado.marca = ""; $("#f-marca").value = ""; }]);
  if (estado.precio) activos.push([$("#f-precio").selectedOptions[0].text, () => { estado.precio = ""; $("#f-precio").value = ""; }]);
  cont.hidden = activos.length === 0;
  activos.forEach(([txt, quitar]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("aria-pressed", "true");
    b.setAttribute("aria-label", `Quitar filtro ${txt}`);
    b.innerHTML = `<span></span><svg class="ico" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
    b.firstChild.textContent = txt;
    b.addEventListener("click", () => { quitar(); aplicar(); });
    cont.append(b);
  });
}

function limpiarFiltros() {
  Object.assign(estado, { texto: "", marca: "", precio: "" });
  $("#f-texto").value = ""; $("#f-marca").value = ""; $("#f-precio").value = "";
  aplicar();
}

// ------------------------------------------------------------------
// Pintado
// ------------------------------------------------------------------
function pintarFecha(iso) {
  const fechas = estado.autos.map((a) => a.visto).filter(Boolean).sort();
  const ult = fechas[fechas.length - 1] || (iso || "").slice(0, 10);
  if (!ult) return;
  const d = new Date(ult + "T12:00:00");
  $("#fecha-actualizado").textContent = "· " + d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function pintarPortada() {
  const a = estado.autos;
  $("#cifra-autos").textContent = a.length;
  $("#cifra-marcas").textContent = new Set(a.map((x) => x.marca)).size;
  const precios = a.map((x) => x.precio).filter((p) => p > 0);
  $("#cifra-desde").textContent = precios.length ? precioTxt(Math.min(...precios)) : "—";

  // Fondo de la portada: la foto del auto más reciente que tenga foto
  const conFoto = ordenar(a).find((x) => x.fotos.length);
  const img = $("#portada-img");
  if (conFoto) {
    img.onload = () => img.classList.add("cargada");
    img.onerror = () => (img.hidden = true);
    img.src = conFoto.fotos[0];
    img.hidden = false;
  }
}

function pintarEsqueletos() {
  const rej = $("#rejilla");
  rej.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const t = document.createElement("div");
    t.className = "tarjeta tarjeta--esqueleto";
    t.setAttribute("aria-hidden", "true");
    t.innerHTML = `<div class="tarjeta-media"></div><div class="tarjeta-cuerpo"><div class="barra-esq barra-esq--1"></div><div class="barra-esq barra-esq--2"></div><div class="barra-esq barra-esq--3"></div><div class="barra-esq barra-esq--4"></div></div>`;
    rej.append(t);
  }
}

function pintarRejilla(lista) {
  const rej = $("#rejilla");
  rej.innerHTML = "";
  if (!lista.length) {
    rej.append(vacio("No hay autos con esos filtros.", "Quitar filtros", limpiarFiltros));
    return;
  }
  const frag = document.createDocumentFragment();
  lista.forEach((auto, i) => frag.append(crearTarjeta(auto, i)));
  rej.append(frag);
}

function vacio(texto, boton, accion) {
  const d = document.createElement("div");
  d.className = "vacio";
  d.innerHTML = `<p></p><button type="button" class="btn btn--fantasma btn--chico"></button>`;
  d.querySelector("p").textContent = texto;
  const b = d.querySelector("button");
  b.textContent = boton;
  b.addEventListener("click", accion);
  return d;
}

const ICO = {
  anio: '<svg class="ico" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  km: '<svg class="ico" viewBox="0 0 24 24"><path d="M4.5 16a8 8 0 1 1 15 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.3"/></svg>',
};

function crearTarjeta(auto, i) {
  const t = $("#tpl-tarjeta").content.firstElementChild.cloneNode(true);
  t.style.setProperty("--i", Math.min(i, 8));

  $(".tarjeta-marca", t).textContent = auto.marca;
  $(".tarjeta-modelo", t).textContent = auto.modelo || auto.titulo;
  $(".tarjeta-version", t).textContent = auto.version || "";
  $(".tarjeta-precio", t).textContent = auto.precio ? precioTxt(auto.precio) : "Consultar";

  const datos = $(".tarjeta-datos", t);
  if (auto.anio) datos.insertAdjacentHTML("beforeend", `<li>${ICO.anio}<span>${auto.anio}</span></li>`);
  if (auto.km !== null && auto.km !== undefined) datos.insertAdjacentHTML("beforeend", `<li>${ICO.km}<span>${fmtNum.format(auto.km)} km</span></li>`);

  const etq = $(".etiquetas", t);
  if (auto.bajoPrecio) etq.insertAdjacentHTML("beforeend", `<span class="etiqueta etiqueta--baja">Bajó de precio</span>`);
  else if (auto.nuevo) etq.insertAdjacentHTML("beforeend", `<span class="etiqueta etiqueta--nuevo">Recién llegado</span>`);

  const wa = $(".tarjeta-wa", t);
  wa.href = waLink(`Hola, me interesa el ${auto.titulo}`);
  wa.setAttribute("aria-label", `Preguntar por WhatsApp por el ${auto.titulo}`);

  montarCarrusel(t, auto, i === 0);
  return t;
}

// ------------------------------------------------------------------
// Carrusel: scroll-snap nativo (se desliza con el dedo) + flechas en escritorio
// ------------------------------------------------------------------
function montarCarrusel(t, auto, prioridad) {
  const car = $(".carrusel", t);
  const puntos = $(".puntos", t);
  const izq = $(".flecha--izq", t);
  const der = $(".flecha--der", t);
  const nombre = `${auto.marca} ${auto.modelo}`.trim();
  car.setAttribute("aria-label", `Fotos del ${auto.titulo}`);

  let actual = -1;
  const actualizar = () => {
    const total = car.children.length;
    const n = Math.min(total - 1, Math.round(car.scrollLeft / (car.clientWidth || 1)) || 0);
    if (n === actual) return;
    actual = n;
    $$(".punto", puntos).forEach((p, k) => p.classList.toggle("activo", k === n));
    izq.disabled = n === 0;
    der.disabled = n >= total - 1;
  };

  // Ajusta puntos y flechas según las fotos que realmente cargaron.
  const refrescar = () => {
    const total = car.children.length;
    if (total === 0) car.append(sinFoto(nombre));
    const varias = total > 1;
    izq.hidden = der.hidden = puntos.hidden = !varias;
    puntos.innerHTML = varias ? '<span class="punto"></span>'.repeat(total) : "";
    actual = -1;
    actualizar();
  };

  auto.fotos.forEach((src, n) => {
    const fig = document.createElement("div");
    fig.className = "foto";
    const img = document.createElement("img");
    img.alt = `${auto.titulo} — foto ${n + 1}`;
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    // La primera foto de la primera tarjeta carga normal; todo lo demás es diferido.
    img.loading = prioridad && n === 0 ? "eager" : "lazy";
    if (prioridad && n === 0) img.fetchPriority = "high";
    img.onload = () => fig.classList.add("lista");
    // Foto rota: se quita del carrusel; si no queda ninguna, se muestra el placeholder.
    img.onerror = () => { fig.replaceWith(); refrescar(); };
    img.src = src;
    fig.append(img);
    car.append(fig);
  });

  car.addEventListener("scroll", () => requestAnimationFrame(actualizar), { passive: true });
  izq.addEventListener("click", () => car.scrollBy({ left: -car.clientWidth }));
  der.addEventListener("click", () => car.scrollBy({ left: car.clientWidth }));
  car.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); der.click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); izq.click(); }
  });
  refrescar();
}

function sinFoto(nombre) {
  const d = document.createElement("div");
  d.className = "sin-foto";
  d.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 17h14M6.5 17v1.5M17.5 17v1.5M4 13l1.6-4.3A2 2 0 0 1 7.5 7.4h9a2 2 0 0 1 1.9 1.3L20 13v4H4z"/></svg><span>Fotos próximamente</span>`;
  d.setAttribute("aria-label", `${nombre}: fotos próximamente`);
  return d;
}
