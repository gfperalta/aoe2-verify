// Registra qué jugador eligió alguien en la búsqueda de "Análisis de partida"
// (para el panel de administración).
//
// Cada búsqueda se guarda como una clave vacía en Netlify Blobs; los datos van
// dentro de la propia clave, así el panel puede listarlas todas en una sola
// consulta sin leer valores uno por uno:
//   e/<hora><azar>~<profileId>~<herramienta>~<país>~<nick codificado>
//
// No se guarda la IP ni nada que identifique a la persona: solo el jugador
// buscado, la herramienta, la hora y el país de origen.
import { getStore } from "@netlify/blobs";

const HERRAMIENTAS = new Set(["caster"]);

// "~" separa los campos, por eso no puede aparecer dentro del nick
export function codificar(texto) {
  return encodeURIComponent(texto).replace(/~/g, "%7E");
}

const respuesta = (estado, cuerpo) =>
  cuerpo === undefined
    ? new Response(null, { status: estado })
    : new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });

export async function registrar(req, paisRecibido, store) {
  if (req.method !== "POST") return respuesta(405);

  let datos;
  try {
    datos = await req.json();
  } catch {
    return respuesta(400, { error: "JSON inválido" });
  }

  // Comprobación de que el almacenamiento responde (no escribe nada)
  if (datos?.herramienta === "salud") {
    const { blobs } = await store.list({ prefix: "e/" });
    return respuesta(200, { ok: true, eventosEnPrimeraPagina: blobs.length });
  }

  const id = String(datos?.profileId ?? "");
  const nombre = String(datos?.nombre ?? "").trim().slice(0, 40);
  const herramienta = datos?.herramienta;
  if (!/^\d{1,12}$/.test(id) || !nombre || !HERRAMIENTAS.has(herramienta)) {
    return respuesta(400, { error: "Datos inválidos" });
  }

  const pais = /^[A-Za-z]{2}$/.test(paisRecibido || "") ? paisRecibido.toUpperCase() : "XX";
  const hora = String(Date.now()).padStart(13, "0");
  const azar = Math.random().toString(36).slice(2, 5);
  await store.set(`e/${hora}${azar}~${id}~${herramienta}~${pais}~${codificar(nombre)}`, "1");
  return respuesta(204);
}

export default async (req, context) => registrar(req, context.geo?.country?.code, getStore("busquedas"));

export const config = { path: "/api/registrar" };
