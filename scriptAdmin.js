// =============================
// Panel oculto: búsquedas registradas en "Análisis de partida"
// =============================
// No aparece en ningún menú: se abre y se cierra con Ctrl+F10 (también se cierra
// con Esc). Muestra qué jugadores se buscan, cuándo y desde qué país, con los
// datos que guardan las funciones de Netlify (ver netlify/functions/).
// No pide clave.

let panelAdmin = null;

function nombrePais(codigo) {
  if (!/^[A-Za-z]{2}$/.test(codigo || "") || codigo === "XX") return "Desconocido";
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(codigo.toUpperCase()) || codigo;
  } catch {
    return codigo;
  }
}

function banderaPais(codigo) {
  if (!/^[A-Za-z]{2}$/.test(codigo || "") || codigo === "XX") return `<span class="cc">?</span>`;
  const c = codigo.toLowerCase();
  return `<img class="player-flag-inline" src="https://flagcdn.com/24x18/${c}.png" alt="${codigo}" title="${escapeHtml(nombrePais(codigo))}" />`;
}

function fechaHora(t) {
  return new Date(t).toLocaleString("es-CL", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function abrirPanelAdmin() {
  if (panelAdmin) return;

  panelAdmin = document.createElement("div");
  panelAdmin.className = "admin-overlay";
  panelAdmin.innerHTML = `
    <section class="card admin-panel" role="dialog" aria-modal="true" aria-label="Búsquedas registradas">
      <div class="admin-head">
        <h2>Búsquedas registradas</h2>
        <div class="admin-acciones">
          <button type="button" class="btn btn-ghost sm" data-accion="actualizar">${icono("refresh", 16)}Actualizar</button>
          <button type="button" class="btn btn-ghost sm" data-accion="cerrar" aria-label="Cerrar">${icono("x", 16)}Cerrar</button>
        </div>
      </div>
      <div class="admin-cuerpo"><p class="hint">Cargando… <span class="loader-circle"></span></p></div>
    </section>
  `;
  document.body.appendChild(panelAdmin);

  panelAdmin.addEventListener("click", (e) => {
    if (e.target === panelAdmin) cerrarPanelAdmin(); // clic fuera de la tarjeta
    const accion = e.target.closest("[data-accion]")?.dataset.accion;
    if (accion === "cerrar") cerrarPanelAdmin();
    if (accion === "actualizar") cargarPanelAdmin();
  });
  panelAdmin.querySelector('[data-accion="cerrar"]').focus();
  cargarPanelAdmin();
}

function cerrarPanelAdmin() {
  if (!panelAdmin) return;
  panelAdmin.remove();
  panelAdmin = null;
}

async function cargarPanelAdmin() {
  const cuerpo = panelAdmin?.querySelector(".admin-cuerpo");
  if (!cuerpo) return;
  cuerpo.innerHTML = `<p class="hint">Cargando… <span class="loader-circle"></span></p>`;

  try {
    const res = await fetch("/api/admin-busquedas", { cache: "no-store" });
    if (!panelAdmin) return; // se cerró mientras cargaba
    if (res.status === 404) {
      cuerpo.innerHTML = `<p class="hint error">El registro de búsquedas solo funciona en el sitio publicado, no en una copia local.</p>`;
      return;
    }
    if (!res.ok) throw new Error("HTTP " + res.status);
    renderPanelAdmin(cuerpo, await res.json());
  } catch (e) {
    if (!panelAdmin) return;
    cuerpo.innerHTML = `<p class="hint error">No se pudo consultar el registro (${escapeHtml(e.message)}). Pulsa "Actualizar" para reintentar.</p>`;
  }
}

function renderPanelAdmin(cuerpo, datos) {
  const eventos = Array.isArray(datos.eventos) ? datos.eventos : [];
  if (!eventos.length) {
    cuerpo.innerHTML = `<p class="hint">Todavía no hay búsquedas registradas.</p>`;
    return;
  }

  // Agrupar por jugador (el nombre que se muestra es el de la búsqueda más reciente)
  const porJugador = new Map();
  const porPais = new Map();
  for (const ev of eventos) {
    const j = porJugador.get(ev.id) || { id: ev.id, nombre: ev.nombre, veces: 0, ultima: 0, paises: new Set() };
    j.veces++;
    if (ev.t >= j.ultima) { j.ultima = ev.t; j.nombre = ev.nombre; }
    j.paises.add(ev.pais);
    porJugador.set(ev.id, j);
    porPais.set(ev.pais, (porPais.get(ev.pais) || 0) + 1);
  }
  const ranking = [...porJugador.values()].sort((a, b) => b.veces - a.veces || b.ultima - a.ultima).slice(0, 50);
  const paises = [...porPais.entries()].sort((a, b) => b[1] - a[1]);
  const recientes = [...eventos].reverse().slice(0, 200);

  const chipsPaises = paises
    .slice(0, 12)
    .map(([p, n]) => `<span class="chip">${banderaPais(p)}${escapeHtml(nombrePais(p))} <b class="num">${n}</b></span>`)
    .join("");

  cuerpo.innerHTML = `
    <div class="admin-resumen">
      <div class="chip cy"><b class="num">${datos.total ?? eventos.length}</b> búsquedas</div>
      <div class="chip cy"><b class="num">${porJugador.size}</b> jugadores distintos</div>
      <div class="chip cy"><b class="num">${porPais.size}</b> países</div>
      ${datos.total > eventos.length ? `<span class="admin-nota">Se muestran las últimas ${eventos.length}.</span>` : ""}
    </div>
    <div class="admin-paises">${chipsPaises}</div>
    <div class="admin-columnas">
      <div class="admin-col">
        <h3 class="label">Jugadores más buscados</h3>
        <div class="yscroll">
          <table class="smurf-table">
            <thead><tr><th>#</th><th>Jugador</th><th class="r">Veces</th><th>Última</th><th>Países</th></tr></thead>
            <tbody>${ranking.map((j, i) => `
              <tr>
                <td class="num">${i + 1}</td>
                <td><a class="companion-link" href="https://aoe2companion.com/profile/${encodeURIComponent(j.id)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(j.nombre)}</strong></a></td>
                <td class="r num">${j.veces}</td>
                <td>${fechaHora(j.ultima)}</td>
                <td>${[...j.paises].slice(0, 4).map(banderaPais).join(" ")}</td>
              </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
      <div class="admin-col">
        <h3 class="label">Últimas búsquedas</h3>
        <div class="yscroll">
          <table class="smurf-table">
            <thead><tr><th>Cuándo</th><th>Jugador</th><th>País</th></tr></thead>
            <tbody>${recientes.map((ev) => `
              <tr>
                <td>${fechaHora(ev.t)}</td>
                <td><strong>${escapeHtml(ev.nombre)}</strong></td>
                <td><span class="admin-pais">${banderaPais(ev.pais)}${escapeHtml(nombrePais(ev.pais))}</span></td>
              </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key === "F10") {
    e.preventDefault();
    if (panelAdmin) cerrarPanelAdmin();
    else abrirPanelAdmin();
  } else if (e.key === "Escape" && panelAdmin) {
    cerrarPanelAdmin();
  }
});
