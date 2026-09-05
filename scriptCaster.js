// =============================
// Lógica de la sección: Dashboard para Casters
// =============================

let dashboardData = null;

// ==================================================
// Inicializar la sección principal del dashboard
// ==================================================
function initCasterSection() {
  const casterSection = document.getElementById("caster");
  if (!casterSection) return;

  dashboardData = window.dashboardData || JSON.parse(sessionStorage.getItem("dashboardData"));
  if (!dashboardData) {
    casterSection.innerHTML = `
      <div class="dashboard-empty">
        <p>No se encontró información de la partida. 😕</p>
        <p>Por favor, vuelve a la sección de búsqueda.</p>
      </div>
    `;
    return;
  }


  casterSection.innerHTML = `
    <div class="caster-top-container single-col">
      <div class="caster-top-left full-width">
        <!-- Nueva barra de encabezado: nombre+fecha a la izquierda, botones a la derecha -->
        <div class="caster-header-bar">
          <div class="caster-header-left">
            <div class="caster-map-name">${dashboardData.mapName || "-"}</div>
            <div class="caster-map-date">${formatearFechaBonita(dashboardData.started)}</div>
          </div>

          <div class="caster-header-right">
            <button class="caster-header-btn btn-ver-partidas" type="button">Ver partidas</button>
            <button class="caster-header-btn btn-probabilidades" type="button">Probabilidades de victoria</button>
          </div>
        </div>
      </div>
    </div>
    <div class="caster-root"></div>
  `;




  // ==================================================
  // Tabla de jugadores de ambos equipos
  // ==================================================
  const root = casterSection.querySelector(".caster-root");

  const match = dashboardData;
  const teams = match?.teams || [];

  if (!Array.isArray(teams) || teams.length < 2) {
    root.innerHTML = `<div class="dashboard-empty">No hay información de equipos.</div>`;
    return;
  }

  // Ordenar equipos como en scriptBuscarCaster (team2 es primero en la vista)
  let team1 = teams[1]?.players || [];
  let team2 = teams[0]?.players || [];

  // Ordenar jugadores por color ascendente (si aplica)
  team1 = Array.isArray(team1) ? team1.sort((a, b) => (a.color ?? 0) - (b.color ?? 0)) : [];
  team2 = Array.isArray(team2) ? team2.sort((a, b) => (a.color ?? 0) - (b.color ?? 0)) : [];

  const jugadoresReales = match?.jugadoresReales || [];

  // 🔹 Crear tabla contenedora
  const table = document.createElement("table");
  table.className = "caster-players-table";

  // 🔹 Crear encabezado (corregido sin colspan)
  const thead = document.createElement("thead");
  thead.innerHTML = `
  <tr class="super-header compact">
    <th class="col-team"></th>
    <th class="col-num">#</th>
    <th class="col-civ">Civ</th>
    <th class="col-player">Jugador</th>
    <th class="col-smurf">Cuentas<br>Smurf</th>
    <th class="col-apm text-center">APM<br>Prom</th>

    <!-- 🔹 Encabezados de ELO (tienen la clase col-group-elo) -->
    <th class="col-elo col-group-elo">
      <div class="elo-header">
        <div class="elo-title">ELO 1v1</div>
        <div class="sub">Actual / Máx</div>
      </div>
    </th>

    <th class="col-elo col-group-elo">
      <div class="elo-header">
        <div class="elo-title">ELO TG</div>
        <div class="sub">Actual / Máx</div>
      </div>
    </th>

    <th class="col-elo col-group-elo">
      <div class="elo-header">
        <div class="elo-title">ELO Unranked</div>
        <div class="sub">Actual / Máx</div>
      </div>
    </th>

    <!-- 🔹 Encabezados de Partidas (tienen la clase col-group-partidas) -->
    <th class="col-partidas col-group-partidas">
      <div class="partidas-header">
        <div class="partidas-title">Partidas 1v1</div>
        <div class="sub">Total / % Ganadas</div>
      </div>
    </th>

    <th class="col-partidas col-group-partidas">
      <div class="partidas-header">
        <div class="partidas-title">Partidas TG</div>
        <div class="sub">Total / % Ganadas</div>
      </div>
    </th>

    <th class="col-partidas col-group-partidas">
      <div class="partidas-header">
        <div class="partidas-title">Partidas Unranked</div>
        <div class="sub">Total / % Ganadas</div>
      </div>
    </th>
  </tr>
`;

  table.appendChild(thead);

  // calcular número real de columnas sumando colSpan
  const totalCols = Array.from(thead.querySelectorAll("th")).reduce((sum, th) => sum + (th.colSpan || 1), 0);

  const tbody = document.createElement("tbody");

  // Función para crear filas de cada equipo
  function crearFilasEquipo(nombreEquipo, jugadores) {
    if (!Array.isArray(jugadores) || jugadores.length === 0) return;

    jugadores.forEach((p, idx) => {
      const realData = (Array.isArray(jugadoresReales) ? jugadoresReales.find(j => j.profileId === p.profileId) : null) || {};
      const row = document.createElement("tr");

      // Columna 1: Nombre del equipo (solo en la primera fila)
      if (idx === 0) {
        const tdEquipo = document.createElement("td");
        tdEquipo.className = "team-name-cell col-team";
        tdEquipo.rowSpan = jugadores.length;
        tdEquipo.innerHTML = `<div class="vertical-text">${nombreEquipo}</div>`;
        row.appendChild(tdEquipo);
      }

      // Columna 2: Color (con número)
      const tdColor = document.createElement("td");
      tdColor.className = "player-color-cell col-num";
      tdColor.innerHTML = `<div class="player-color-box" style="background:${p.colorHex || "#999"};">${p.color ?? ""}</div>`;
      row.appendChild(tdColor);

      // Columna 3: Civilización
      const tdCiv = document.createElement("td");
      tdCiv.className = "player-civ-cell col-civ";
      tdCiv.innerHTML = p.civImageUrl
        ? `<img src="${p.civImageUrl}" alt="${p.civName || ''}" title="${p.civName || ''}" class="player-civ-icon" />`
        : `<div class="no-civ">-</div>`;
      row.appendChild(tdCiv);

      // Columna 4: Jugador
      const tdNombre = document.createElement("td");
      tdNombre.className = "player-name-cell col-player";
      const flagCode = (p.country || (realData.country || "")).toLowerCase();
      const flagName = realData.countryName || "";
      const flag = flagCode ? `<img src="https://flagcdn.com/24x18/${flagCode}.png" alt="${flagName}" title="${flagName}" class="player-flag-inline" />` : "";
      const nombreJugador = p.name || realData.name || "-";
      const nombreClan = realData.clan || "";
      tdNombre.innerHTML = `
        <div class="player-name-combo">
          ${flag} <span class="player-name-text">${nombreJugador}</span>
        </div>
        <div class="player-clan-small">Clan: ${nombreClan}</div>
      `;
      row.appendChild(tdNombre);

      // Columna 5: Smurf
      const tdSmurf = document.createElement("td");
      tdSmurf.className = "col-smurf text-center";
      const smurfData = (dashboardData.Smurf || []).find(s => s.jugadorId === p.profileId);

      if (smurfData && Array.isArray(smurfData.cuentas) && smurfData.cuentas.length > 1) {
        const span = document.createElement("span");
        span.className = "smurf-si";
        span.textContent = "Sí";
        span.title = "Ver cuentas relacionadas";
        span.addEventListener("click", (e) => {
          e.stopPropagation();

          // Obtener el panel y elementos internos
          const drawer = document.querySelector(".smurf-drawer");
          const table = drawer.querySelector(".smurf-drawer-table");
          const empty = drawer.querySelector(".smurf-drawer-empty");

          // Limpiar tabla anterior
          table.innerHTML = "";
          empty.style.display = "none";
          table.classList.remove("hidden");

          // Generar tabla de cuentas smurf
          const cuentas = smurfData.cuentas || [];
          if (!cuentas.length) {
            empty.textContent = "No hay cuentas smurf registradas.";
            empty.style.display = "block";
            table.classList.add("hidden");
          } else {
            const headers = Object.keys(cuentas[0]);
            let html = "<thead><tr>";
            headers.forEach(h => html += `<th>${h}</th>`);
            html += "</tr></thead><tbody>";

            cuentas.forEach((c, idx) => {
              html += "<tr>";
              headers.forEach(h => {
                let value = c[h];
                // Detectar columnas ELO relevantes
                const colKey = h.toLowerCase().replace(/\s+/g, '');
                const isEloColumn = ["elo1v1", "maximo1v1", "elotg", "maximotg"].includes(colKey);
                let cellClass = "";

                if (idx > 0 && isEloColumn && !isNaN(parseFloat(value))) {
                  const ref = parseFloat(cuentas[0][h]);
                  const val = parseFloat(value);
                  if (val > ref) cellClass = "elo-higher"; // 🔹 marcar en rojo
                }

                html += `<td class="${cellClass}">${value}</td>`;
              });
              html += "</tr>";
            });

            html += "</tbody>";
            table.innerHTML = html;

            // Doble clic en celdas rojas -> copiar al portapapeles
            table.querySelectorAll(".elo-higher").forEach((cell) => {
            cell.addEventListener("dblclick", () => {
              const row = cell.closest("tr");
              const headers = Array.from(table.querySelectorAll("thead th"));
              const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
              const columnName = headers[colIndex]?.innerText?.trim() || "Columna";
              const value = cell.innerText?.trim() || "";

              // Buscar la celda que contiene el nombre de la cuenta Smurf
              let accountName = "Cuenta desconocida";
              const allHeaders = headers.map(h => h.innerText.toLowerCase().trim());
              const nombreIndex = allHeaders.findIndex(h =>
                h.includes("nombre") || h.includes("cuenta") || h.includes("smurf")
              );

              if (nombreIndex !== -1) {
                accountName = row.children[nombreIndex]?.innerText?.trim() || accountName;
              }

              const message = `* Cuenta Smurf "${accountName}" – ${columnName}: ${value}`;

              navigator.clipboard.writeText(message).then(() => {
                // Efecto visual de confirmación
                cell.classList.add("copied");
                setTimeout(() => cell.classList.remove("copied"), 800);
              }).catch(err => console.error("Error al copiar:", err));
            });
          });

          }

          // Abrir drawer
          drawer.classList.add("open");
        });
        tdSmurf.appendChild(span);
      }
      row.appendChild(tdSmurf);


      // Columna APM (inicialmente vacía)
      const tdAPM = document.createElement("td");
      tdAPM.className = "col-apm text-center";
      tdAPM.textContent = ""; // temporal hasta recibir el dato real
      tdAPM.dataset.profileId = p.profileId; // guardar para actualización posterior
      row.appendChild(tdAPM);


      // Columnas ELOs y Partidas
      // Buscar ELOs por leaderboardId, sin depender del orden del arreglo
      const leaderboards = realData.leaderboards || [];

      function getLeaderboardById(id) {
        return leaderboards.find(lb => lb.leaderboardId === id) || {};
      }

      const l1 = getLeaderboardById("rm_1v1");   // ELO y Partidas 1v1
      const l2 = getLeaderboardById("rm_team");  // ELO y Partidas TG
      const l3 = getLeaderboardById("unranked"); // ELO y Partidas Unranked

      function formatElo_Partidas(value) {
        return (value || value === 0) ? value : "0";
      }

      function crearCeldaElo(actual, maximo) {
        const td = document.createElement("td");
        td.className = "col-elo fade-group col-group-elo text-center";
        td.innerHTML = `
          <div class="elo-actual">${formatElo_Partidas(actual)}</div>
          <div class="elo-maximo">${formatElo_Partidas(maximo)}</div>
        `;
        return td;
      }

      function crearCeldaPartidas(total, ganadas) {
        const td = document.createElement("td");
        td.className = "col-partidas fade-group col-group-partidas text-center";

        // Si el valor de ganadas es válido, agregamos el símbolo de porcentaje
        const porcentaje = (ganadas || ganadas === 0)
          ? `${formatElo_Partidas(ganadas)}%`
          : "-";

        td.innerHTML = `
          <div class="partidas-total">${formatElo_Partidas(total)}</div>
          <div class="partidas-ganadas">${porcentaje}</div>
        `;
        return td;
      }

      row.appendChild(crearCeldaElo(l1.rating, l1.maxRating));
      row.appendChild(crearCeldaElo(l2.rating, l2.maxRating));
      row.appendChild(crearCeldaElo(l3.rating, l3.maxRating));

      row.appendChild(crearCeldaPartidas(l1.games, Math.round((l1.wins / l1.games) * 100) ));
      row.appendChild(crearCeldaPartidas(l2.games, Math.round((l2.wins / l2.games) * 100) ));
      row.appendChild(crearCeldaPartidas(l3.games, Math.round((l3.wins / l3.games) * 100) ));


      tbody.appendChild(row);
    });
  }

  // 🔹 Líneas divisorias
  /*const dividerTop = document.createElement("tr");
  dividerTop.className = "team-divider";
  dividerTop.innerHTML = `<td colspan="${totalCols}"></td>`;
  tbody.appendChild(dividerTop);*/

  crearFilasEquipo("Team 1", team1);

  const dividerMiddle = document.createElement("tr");
  dividerMiddle.className = "team-divider";
  dividerMiddle.innerHTML = `<td colspan="${totalCols}"></td>`;
  tbody.appendChild(dividerMiddle);

  crearFilasEquipo("Team 2", team2);

 
  table.appendChild(tbody);
  root.appendChild(table);



  // 🔹 Ocultar columnas de partidas por defecto (solo mostrar ELO)
  const partidasHeaders = table.querySelectorAll(".col-group-partidas");
  const partidasCells = table.querySelectorAll("td.col-group-partidas");
  partidasHeaders.forEach(el => el.classList.add("hidden"));
  partidasCells.forEach(el => el.classList.add("hidden"));



  // =====================================
  // 🔹 Consultar APM promedio (con proxies)
  // =====================================
  async function actualizarAPMs() {
    const celdasAPM = table.querySelectorAll("td.col-apm");
    const profileIds = Array.from(celdasAPM).map(td => td.dataset.profileId);

    // Mostrar TOAST inicial y spinners
    mostrarToast("⚙️ Calculando APM promedio de los jugadores... puede tardar hasta 1 minuto.", 55000);

    // Colocar spinner temporal en cada celda APM
    celdasAPM.forEach(td => {
      td.innerHTML = '<div class="spinner"></div>';
    });


    
    // Proxies que eliminan CORS (tu arreglo original)
    const proxies = [
      targetUrl => `https://corsproxy.io/?${targetUrl}`,
      targetUrl => `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
      targetUrl => `https://yacdn.org/proxy/${targetUrl}`,
      targetUrl => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
    ];

    // Función para probar proxies secuencialmente (igual que tu código)
    async function fetchConProxies(baseUrl) {
      for (const makeProxy of proxies) {
        const proxyUrl = makeProxy(baseUrl);
        try {
          const res = await fetch(proxyUrl);
          if (!res.ok) continue;
          const data = await res.json();
          if (data && typeof data === "object") {
            return data; // Éxito: devuelve data y sale del bucle
          }
        } catch {
          // Si falla, continúa con el siguiente proxy
        }
      }
      return null;
    }

    // Ejecutar todas las peticiones en paralelo
    const promesas = profileIds.map(async (id) => {
      if (!id) return null;

      // Construir la URL original (como en tu ejemplo)
      const filters = [
        { field: "player_relic_id", operator: "equals", value: id },
        { field: "started_time", operator: "greater_than_or_equals", value: "2025-01-01T00:00" }
      ];
      const query = filters.map(f => `filter=${encodeURIComponent(JSON.stringify(f))}`).join("&");
      const baseUrl = `https://www.aoe2insights.com/stats/api/match-ups/?${query}&aggregation=agg_mean_eapm&start=0&limit=5`;

      const data = await fetchConProxies(baseUrl);
      if (!data) return null;

      // Buscar el valor de APM en distintas rutas posibles (como tu script)
      const rowsData = data?.rows || data?.contents?.rows || null;
      const apmValueRaw = rowsData?.agg_mean_eapm?.[0];
      const apmValue = (apmValueRaw == null || isNaN(Number(apmValueRaw)))
        ? NaN
        : Math.round(Number(apmValueRaw));

      return (!isNaN(apmValue) && apmValue > 0) ? apmValue : null;
    });

    // Esperar todas las promesas en paralelo
    const resultados = await Promise.all(promesas);


    // Quitar los spinners antes de escribir los valores finales
    const spinners = document.querySelectorAll(".spinner");
    spinners.forEach(spinner => spinner.remove());

    // Mostrar TOAST final
    mostrarToast("✅ APM actualizadas correctamente.", 4000);


    // Pintar los resultados finales en las filas (solo las celdas de jugadores)
    resultados.forEach((apm, i) => {
      const td = celdasAPM[i];
      td.textContent = apm != null ? apm : "";
    });
  }

    // Llamar en segundo plano (sin bloquear la UI)
    setTimeout(() => { actualizarAPMs(); }, 1500);









  // ==================================================
  // Drawer inferior para mostrar cuentas smurf
  // ==================================================
  const drawer = document.createElement("div");
  drawer.className = "smurf-drawer";
  drawer.innerHTML = `
    <div class="smurf-drawer-content">
      <div class="smurf-drawer-header">
        <span class="smurf-drawer-title">Cuentas Smurf Encontradas</span>
        <button class="smurf-drawer-close">✕</button>
      </div>
      <div class="smurf-drawer-body">
        <p class="smurf-drawer-empty">Selecciona un jugador con Smurfs para ver sus cuentas.</p>
        <table class="smurf-drawer-table hidden"></table>
      </div>
    </div>
  `;
  casterSection.appendChild(drawer);




  // ---- Listeners para los botones del encabezado ----
  // ---- Listeners para los botones del encabezado ----
  const btnVerPartidas = casterSection.querySelector(".btn-ver-partidas");
  const btnProbabilidades = casterSection.querySelector(".btn-probabilidades");

  // Toggle único: Ver partidas <-> Ver ELO
  if (btnVerPartidas) {
    // Determinar estado inicial leyendo si las columnas de partidas están ocultas
    const inicialmentePartidasHeaders = table.querySelectorAll("th.col-group-partidas, td.col-group-partidas");
    const partidasHiddenInitially = inicialmentePartidasHeaders.length ? inicialmentePartidasHeaders[0].classList.contains("hidden") : true;
    // Si las columnas de partidas están ocultas => estamos mostrando ELO
    let mostrandoELO = partidasHiddenInitially;

    // Asegurar texto inicial del botón
    btnVerPartidas.textContent = mostrandoELO ? "Ver partidas" : "Ver ELO's";

    btnVerPartidas.addEventListener("click", (e) => {
      e.stopPropagation();

      const eloGroup = table.querySelectorAll("th.col-group-elo, td.col-group-elo");
      const partidasGroup = table.querySelectorAll("th.col-group-partidas, td.col-group-partidas");

      if (mostrandoELO) {
        // Pasar a modo PARTIDAS
        eloGroup.forEach(el => el.classList.add("hidden"));
        partidasGroup.forEach(el => el.classList.remove("hidden"));
        btnVerPartidas.textContent = "Ver ELO's";
        mostrandoELO = false;
      } else {
        // Volver a modo ELO
        partidasGroup.forEach(el => el.classList.add("hidden"));
        eloGroup.forEach(el => el.classList.remove("hidden"));
        btnVerPartidas.textContent = "Ver partidas";
        mostrandoELO = true;
      }
    });
  }


  if (btnProbabilidades) {
    btnProbabilidades.addEventListener("click", (e) => {
      e.stopPropagation();
      // Acción placeholder: mostrar probabilidades; reemplaza con tu lógica
      console.log("📊 Probabilidades de victoria — pressed");
      // ejemplo: abrir panel que uses para probabilidades
    });
  }


  // Acción de cierre
  drawer.querySelector(".smurf-drawer-close").addEventListener("click", () => {
    drawer.classList.remove("open");
  });


  // 🔹 Cierre automático del drawer
  // 1️⃣ Si el usuario cambia de sección
  document.addEventListener("sectionChange", (e) => {
    if (e.detail !== "caster") {
      drawer.classList.remove("open");
    }
  });

  // 2️⃣ Si el usuario hace clic fuera del área del drawer
  document.addEventListener("click", (event) => {
    const isClickInsideDrawer = drawer.contains(event.target);
    const isClickOnSmurfButton = event.target.closest(".smurf-si");
    if (!isClickInsideDrawer && !isClickOnSmurfButton) {
      drawer.classList.remove("open");
    }
  });

  // 3️⃣ Si el contenedor principal del caster pierde el foco
  //const casterSection = document.getElementById("caster");
  if (casterSection) {
    casterSection.addEventListener("focusout", () => {
      // Esperar un breve momento por si el foco pasa dentro del drawer
      setTimeout(() => {
        if (!casterSection.contains(document.activeElement)) {
          drawer.classList.remove("open");
        }
      }, 100);
    });
  }


}




//dar formato a la fecha inicial de la partida
function formatearFechaLocal(fechaISO) {
  if (!fechaISO) return "-";
  const fecha = new Date(fechaISO);
  const opciones = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  let texto = fecha.toLocaleString("es-ES", opciones);
  texto = texto.replace(",", "")
               .replace(/\s*a\.?\s*m\.?/i, " am")
               .replace(/\s*p\.?\s*m\.?/i, " pm");
  return texto.trim();
}

function formatearFechaBonita(fechaIso) {
  if (!fechaIso) return "-";
  const fecha = new Date(fechaIso);
  const dia = String(fecha.getDate()).padStart(2, "0");

  const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const mesesLargos = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const mesCorto = mesesCortos[fecha.getMonth()];
  const mesLargo = mesesLargos[fecha.getMonth()];
  const hora = fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `${dia} ${mesCorto} ${hora}`;
}




/*Mostrar mensaje toast mientras se calculan las apm*/
function mostrarToast(mensaje, duracion = 4000) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, duracion);
}




// =============================
// Destruir sección
// =============================
function destroyCasterSection() {
  console.log("🚪 Se salió de la sección Caster");
  dashboardData = null;
  const casterSection = document.getElementById("caster");
  if (casterSection) casterSection.innerHTML = "";
}

// =============================
// Escuchar evento de cambio de sección
// =============================
document.addEventListener("sectionChange", (e) => {
  if (e.detail === "caster") {
    initCasterSection();
  } else {
    destroyCasterSection();
  }
});
