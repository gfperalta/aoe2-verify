// Entrega las búsquedas registradas por registrar.mjs al panel oculto del sitio
// (se abre con Ctrl+F10). No pide clave: lo único que lo "protege" es que el
// panel no aparece en ningún menú. Si algún día se quiere restringir, aquí es
// donde habría que comprobar una clave.
import { getStore } from "@netlify/blobs";

const LIMITE = 1000; // cuántas búsquedas recientes se devuelven como máximo

const json = (estado, cuerpo) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export function decodificar(clave) {
  const [prefijo, id, herramienta, pais, nombre] = clave.split("~");
  if (!prefijo || nombre === undefined) return null;
  let nick;
  try {
    nick = decodeURIComponent(nombre);
  } catch {
    nick = nombre;
  }
  return { t: Number(prefijo.slice(2, 15)), id, herramienta, pais, nombre: nick };
}

export async function listar(req, store) {
  if (req.method !== "GET") return json(405, { error: "Método no permitido" });

  const claves = [];
  for await (const pagina of store.list({ prefix: "e/", paginate: true })) {
    for (const b of pagina.blobs) claves.push(b.key);
  }
  claves.sort();
  const eventos = claves.slice(-LIMITE).map(decodificar).filter(Boolean);
  return json(200, { total: claves.length, mostrados: eventos.length, eventos });
}

export default async (req) => listar(req, getStore("busquedas"));

export const config = { path: "/api/admin-busquedas" };
