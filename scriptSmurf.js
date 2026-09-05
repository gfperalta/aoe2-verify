// =============================
// Lógica de la sección: Cuentas Smurf
// =============================

let smurfInput = null;
let resultsContainer = null;
let tablaContainer = null;
let selectedProfileId = null;

// =============================
// Inicializar la sección
// =============================
function initSmurfSection() {
  const smurfSection = document.getElementById("smurf");
  if (!smurfSection) return;

  smurfSection.innerHTML = `
  <div class="smurf-header">
    <h2 class="smurf-title">Buscar cuentas Smurf</h2>
    <p class="smurf-subtitle"></p>
  </div>

  <div class="smurf-search">
    <div class="smurf-input-group">
      <input type="text" id="smurfInput" class="smurf-input" placeholder="Escribe un nombre de jugador..." autocomplete="off" />
    </div>
  </div>

  <div id="smurfResults" class="smurf-results"></div>
  <div id="smurfTableContainer" class="smurf-table-container"></div>
`;

  smurfInput = document.querySelector("#smurfInput");
  resultsContainer = document.querySelector("#smurfResults");
  tablaContainer = document.querySelector("#smurfTableContainer");

  if (smurfInput) smurfInput.addEventListener("input", handleSmurfInput);

  smurfInput.focus();
}

// =============================
// Manejo del input de búsqueda
// =============================
let debounceTimer = null;

function handleSmurfInput(e) {
  const query = e.target.value.trim();
  clearTimeout(debounceTimer);
  // Al iniciar nueva búsqueda, limpiar tabla
  if (tablaContainer) tablaContainer.innerHTML = "";
  debounceTimer = setTimeout(() => {
    buscarProfiles(query);
  }, 400);
}

// =============================
// Buscar perfiles (API Companion)
// =============================
async function buscarProfiles(query) {
  if (!resultsContainer) return;
  if (!query || query.length < 3) {
    resultsContainer.innerHTML = `<div class="hint">Escribe 3 o más caracteres para buscar.</div>`;
    return;
  }

  resultsContainer.innerHTML = `<div class="hint">Buscando... <span class="loader-circle"></span></div>`;

  try {
    const url = `https://data.aoe2companion.com/api/profiles?search=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error en la búsqueda");
    const data = await res.json();
    renderSearchResults(data.profiles || []);
  } catch (e) {
    resultsContainer.innerHTML = `<div class="hint error">Error buscando: ${e.message}</div>`;
  }
}

// =============================
// Renderizar lista de resultados
// =============================
function renderSearchResults(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    resultsContainer.innerHTML = `<div class="hint">Jugador no encontrado.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  profiles.forEach((p) => {
    const row = document.createElement("div");
    row.className = "search-row";
    row.innerHTML = `
      <div class="sr-left">
        <div class="sr-name">${escapeHtml(p.name)}</div>
        <div class="sr-meta">País: ${escapeHtml(p.country || "-")} • Clan: ${escapeHtml(p.clan || "-")}</div>
      </div>
      <div class="sr-right">ID: ${escapeHtml(String(p.profileId))}</div>
    `;
    row.addEventListener("click", () => seleccionarJugador(p.profileId, p.name));
    frag.appendChild(row);
  });

  resultsContainer.innerHTML = "";
  resultsContainer.appendChild(frag);
}

// =============================
// Selección del jugador
// =============================
function seleccionarJugador(profileId, playerName) {
  selectedProfileId = profileId;
  smurfInput.value = playerName;
   // 🔹 Limpiamos los resultados sin mostrar ningún texto
  resultsContainer.innerHTML = "";

  // 🔹 Llamamos directamente a la construcción de la tabla
  construirMatrizPrincipal(profileId);
}

// =============================
// Construir matriz de cuentas familiares
// =============================
async function construirMatrizPrincipal(profileId) {
  if (!profileId) return;

  resultsContainer.innerHTML = `<div class="hint">Buscando cuentas familiares... <span class="loader-circle"></span></div>`;

  const matriz = [];
  const visitados = new Set();

  async function obtenerData(pid) {
    const url = `https://data.aoe2companion.com/api/profiles/${encodeURIComponent(pid)}?language=es&extend=stats&page=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("No encontrado");
      return await res.json();
    } catch {
      return null;
    }
  }

  async function procesarCuenta(pid, padre = null) {
    pid = String(pid).trim();
    if (!pid || visitados.has(pid)) return;
    visitados.add(pid);

    const dataCuenta = await obtenerData(pid);
    if (!dataCuenta) return;

    const lb1v1 = dataCuenta.leaderboards?.find((l) => l.leaderboardId === "rm_1v1") || {};
    const lbTG = dataCuenta.leaderboards?.find((l) => l.leaderboardId === "rm_team") || {};

    const fila = {
      n: matriz.length + 1,
      padre: padre || dataCuenta.name || "Principal",
      nombre: dataCuenta.name || "Desconocido",
      pais: dataCuenta.countryName || "",
      id: pid,
      elo1v1: lb1v1.rating ?? 0,
      max1v1: lb1v1.maxRating ?? 0,
      juegos1v1: lb1v1.games ?? 0,
      eloTG: lbTG.rating ?? 0,
      maxTG: lbTG.maxRating ?? 0,
      juegosTG: lbTG.games ?? 0,
    };

    matriz.push(fila);

    const linkedProfiles = dataCuenta.linkedProfiles || dataCuenta.params?.linkedProfiles || [];
    if (Array.isArray(linkedProfiles) && linkedProfiles.length > 0) {
      for (const linked of linkedProfiles) {
        const hijoId = linked?.profileId ?? linked?.id ?? null;
        if (hijoId) await procesarCuenta(hijoId, dataCuenta.name);
      }
    }
  }

  await procesarCuenta(profileId);
  resultsContainer.innerHTML = "";
  renderizarTabla(matriz);
}

// =============================
// Renderizar tabla en pantalla
// =============================
function renderizarTabla(matriz) {
  if (!Array.isArray(matriz) || matriz.length === 0) {
    tablaContainer.innerHTML = `<div class="hint">No se encontraron cuentas familiares.</div>`;
    return;
  }

  const table = document.createElement("table");
  table.className = "smurf-table";
  const thead = document.createElement("thead");

  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Cuenta padre</th>
      <th>Cuenta hija</th>
      <th>Pais</th>
      <th>ID Companion</th>
      <th>Elo 1v1</th>
      <th>Máx 1v1</th>
      <th>Juegos 1v1</th>
      <th>Elo TG</th>
      <th>Máx TG</th>
      <th>Juegos TG</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  const ref = matriz[0]; // primera fila (referencia)
  
  matriz.forEach((fila, i) => {
  const tr = document.createElement("tr");

  // Si es la primera fila, dejar la columna "Cuenta" vacía
  const nombreCuenta = i === 0 ? "" : escapeHtml(fila.nombre);

  // 🔹 Nuevo: el ID ahora es un enlace a AoE2 Companion
  const enlaceId = `
  <a href="https://aoe2companion.com/profile/${fila.id}"
     target="_blank"
     rel="noopener noreferrer"
     class="companion-link">
     ${fila.id}
  </a>
`;


  tr.innerHTML = `
    <td>${fila.n}</td>
    <td>${escapeHtml(fila.padre)}</td>
    <td>${nombreCuenta}</td>
    <td>${fila.pais}</td>
    <td>${enlaceId}</td>
    <td>${fila.elo1v1}</td>
    <td>${fila.max1v1}</td>
    <td>${fila.juegos1v1}</td>
    <td>${fila.eloTG}</td>
    <td>${fila.maxTG}</td>
    <td>${fila.juegosTG}</td>
  `;

  // 🔹 Colorear si es mayor al valor de la fila 1
  if (i > 0) {
    const celdas = tr.querySelectorAll("td");
    const campos = ["elo1v1", "max1v1", "juegos1v1", "eloTG", "maxTG", "juegosTG"];
    campos.forEach((campo, idx) => {
      const valorFila = Number(fila[campo] ?? 0);
      const valorRef = Number(matriz[0][campo] ?? 0);
      if (!isNaN(valorFila) && !isNaN(valorRef) && valorFila > valorRef) {
        const td = celdas[5 + idx];
        if (td) {
          td.style.color = "var(--color-principal4)";
          td.style.fontWeight = "600";
        }
      }
    });
  }

  tbody.appendChild(tr);
});


  table.appendChild(tbody);

  tablaContainer.innerHTML = "";
  tablaContainer.appendChild(table);

  // Mensaje explicativo (solo si hay más de una fila)
  if (matriz.length > 1) {
    const msg = document.createElement("p");
    msg.className = "tabla-nota";
    msg.textContent =
      "** Las celdas con color verde indican valores mayores que los de la cuenta principal (primera fila).";
    tablaContainer.appendChild(msg);
  }
}

// =============================
// Utilidades
// =============================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// =============================
// Destruir sección
// =============================
function destroySmurfSection() {
  if (smurfInput) smurfInput.removeEventListener("input", handleSmurfInput);
  smurfInput = null;
  resultsContainer = null;
  tablaContainer = null;
  selectedProfileId = null;
}

// =============================
// Escuchar evento de cambio de sección
// =============================
document.addEventListener("sectionChange", (e) => {
  if (e.detail === "smurf") {
    initSmurfSection();
  } else {
    destroySmurfSection();
  }
});
