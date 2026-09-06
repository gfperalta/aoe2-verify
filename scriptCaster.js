// =============================
// Lógica de la sección: Dashboard para Casters
// =============================

let dashboardData = null;

// 🔹 Monitoreo automático: revisa cada 10s si hay una partida más reciente
// para el jugador que se está viendo, y si la hay, actualiza el dashboard.
let dashboardMonitorInterval = null;
let dashboardMonitorBusy = false;

// Referencias a los listeners del drawer de Smurfs, para poder quitarlos
// antes de volver a registrarlos cada vez que se (re)inicializa la sección.
let sectionChangeDrawerListener = null;
let outsideClickDrawerListener = null;

// ==================================================
// Analizar las cuentas Smurf de un jugador
// ==================================================
// Recibe la entrada de `dashboardData.Smurf` correspondiente a un jugador
// (con su arreglo `cuentas`, donde cuentas[0] es la cuenta con la que está
// jugando actualmente y el resto son sus cuentas smurf/alternas).
// Devuelve null si no tiene cuentas smurf, o un objeto con:
//   - totalSmurfs: cantidad de cuentas smurf (sin contar la que está jugando)
//   - cuentaSuperior: la cuenta smurf con mayor ELO 1v1, solo si supera al
//     ELO 1v1 de la cuenta actual (si ninguna lo supera, es null)
function analizarCuentasSmurf(smurfData) {
  if (!smurfData || !Array.isArray(smurfData.cuentas) || smurfData.cuentas.length <= 1) {
    return null;
  }

  const [cuentaActual, ...cuentasSmurf] = smurfData.cuentas;
  const eloActual = Number(cuentaActual?.elo1v1) || 0;

  let cuentaSuperior = null;
  for (const cuenta of cuentasSmurf) {
    const elo = Number(cuenta?.elo1v1) || 0;
    if (elo > eloActual && (!cuentaSuperior || elo > (Number(cuentaSuperior.elo1v1) || 0))) {
      cuentaSuperior = cuenta;
    }
  }

  return {
    totalSmurfs: cuentasSmurf.length,
    cuentaSuperior,
  };
}

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
            <button class="caster-header-btn btn-volver-busqueda" type="button">← Volver a la búsqueda</button>
            <button class="caster-header-btn btn-toggle-elo" type="button">Ver TG</button>
            <button class="caster-header-btn btn-ver-partidas" type="button">Ver partidas</button>
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

  // ==================================================
  // Precalcular el rango (mín/máx) de la barra de ELO
  // ==================================================
  // La barra necesita una escala común para que sus longitudes sean
  // comparables entre jugadores. En vez de una escala fija (0–3000, donde
  // las diferencias reales entre jugadores de un mismo rango casi no se
  // notarían), usamos una escala dinámica acotada a esta partida: 300
  // puntos por debajo del ELO actual más bajo (sin bajar de 0) y 300 por
  // encima del más alto. Se calcula por separado para 1v1 y para TG,
  // porque el botón "Ver TG / Ver 1v1" alterna cuál de las dos se
  // muestra en la misma barra.
  function obtenerLeaderboards(profileId) {
    const realData = (Array.isArray(jugadoresReales) ? jugadoresReales.find(j => j.profileId === profileId) : null) || {};
    const leaderboards = realData.leaderboards || [];
    return {
      realData,
      l1: leaderboards.find(lb => lb.leaderboardId === "rm_1v1") || {},
      l2: leaderboards.find(lb => lb.leaderboardId === "rm_team") || {},
      l3: leaderboards.find(lb => lb.leaderboardId === "unranked") || {},
    };
  }

  function calcularRango(valores) {
    const nums = valores.filter(v => typeof v === "number" && !isNaN(v) && v > 0);
    if (!nums.length) return { min: 0, max: 1000 };
    let min = Math.min(...nums) - 300;
    const max = Math.max(...nums) + 300;
    if (min < 0) min = 0;
    return { min, max };
  }

  const todosJugadores = [...team1, ...team2];
  const valores1v1 = [];
  const valoresTG = [];
  todosJugadores.forEach((p) => {
    const { l1, l2 } = obtenerLeaderboards(p.profileId);
    if (l1.rating) valores1v1.push(l1.rating);
    if (l2.rating) valoresTG.push(l2.rating);
  });

  const rango1v1 = calcularRango(valores1v1);
  const rangoTG = calcularRango(valoresTG);

  function porcentajeEnRango(valor, rango) {
    if (!valor || isNaN(valor)) return 0;
    const pct = ((valor - rango.min) / (rango.max - rango.min)) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  function formatElo_Partidas(value) {
    return (value || value === 0) ? value : "0";
  }

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

    <!-- 🔹 Encabezados de ELO (tienen la clase col-group-elo) -->
    <th class="col-elo-bar col-group-elo">
      <div class="elo-header">
        <div class="elo-title elo-column-title">ELO 1v1</div>
      </div>
    </th>

    <th class="col-elo-max col-group-elo">
      <div class="elo-header">
        <div class="elo-title">Máx</div>
      </div>
    </th>

    <th class="col-smurf">Cuentas<br>Smurf</th>

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

      // Columnas ELOs y Partidas
      const { l1, l2, l3 } = obtenerLeaderboards(p.profileId);

      // 🔹 Barra horizontal del ELO actual (1v1 o TG, según el botón
      // "Ver TG / Ver 1v1"): el número va a la izquierda y la barra ocupa
      // el resto del ancho de la columna. El ELO máximo ya no va sobre la
      // barra — se muestra aparte, en su propia columna (crearCeldaEloMax),
      // alineada igual para todos los jugadores. Ambas celdas guardan el
      // profileId para que el botón de alternar 1v1/TG pueda actualizarlas.
      function crearBarraElo(actual, rango) {
        const td = document.createElement("td");
        td.className = "col-elo-bar fade-group col-group-elo";
        td.dataset.profileId = p.profileId;
        const pctActual = porcentajeEnRango(actual, rango);
        td.innerHTML = `
          <div class="elo-bar-wrap">
            <div class="elo-bar-value">${formatElo_Partidas(actual)}</div>
            <div class="elo-bar-track">
              <div class="elo-bar-fill" style="width:${pctActual}%; background:${p.colorHex || "var(--color-principal)"}"></div>
            </div>
          </div>
        `;
        return td;
      }

      function crearCeldaEloMax(maximo) {
        const td = document.createElement("td");
        td.className = "col-elo-max fade-group col-group-elo text-center";
        td.dataset.profileId = p.profileId;
        td.innerHTML = `<div class="elo-max-value">${formatElo_Partidas(maximo)}</div>`;
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

      row.appendChild(crearBarraElo(l1.rating, rango1v1));
      row.appendChild(crearCeldaEloMax(l1.maxRating));

      // Columna: Smurf (al final, después del ELO máximo)
      const tdSmurf = document.createElement("td");
      tdSmurf.className = "col-smurf text-center";
      const smurfData = (dashboardData.Smurf || []).find(s => s.jugadorId === p.profileId);
      const analisisSmurf = analizarCuentasSmurf(smurfData);

      if (analisisSmurf) {
        const span = document.createElement("span");
        span.className = "smurf-si";
        span.title = "Ver cuentas relacionadas";

        // 🔹 Si alguna cuenta smurf tiene un ELO 1v1 superior al de la cuenta
        // con la que está jugando, mostramos su nombre + ELO (y el total de
        // cuentas smurf entre paréntesis). Si no, mostramos simplemente "Sí".
        let textoParaCopiar = null;
        if (analisisSmurf.cuentaSuperior) {
          const nombreCuenta = analisisSmurf.cuentaSuperior.nombre || "Desconocido";
          const eloCuenta = analisisSmurf.cuentaSuperior.elo1v1 ?? 0;
          span.classList.add("smurf-alerta");
          span.innerHTML = `
            <span class="smurf-alerta-nombre">${escapeHtml(nombreCuenta)}</span>
            <span class="smurf-alerta-elo">${escapeHtml(eloCuenta)} (${analisisSmurf.totalSmurfs})</span>
          `;
          const textoTotalSmurfs = analisisSmurf.totalSmurfs === 1 ? "cuenta smurf" : "cuentas smurf";
          textoParaCopiar = `${nombreCuenta} ${eloCuenta} (${analisisSmurf.totalSmurfs} ${textoTotalSmurfs})`;
        } else {
          span.textContent = "Sí";
        }

        span.addEventListener("click", (e) => {
          e.stopPropagation();

          // 🔹 Copiar al portapapeles el nombre y ELO de la cuenta smurf detectada
          if (textoParaCopiar) {
            navigator.clipboard.writeText(textoParaCopiar).catch(err =>
              console.error("Error al copiar:", err)
            );
          }

          // Obtener el panel y elementos internos
          const drawer = document.querySelector(".smurf-drawer");
          const drawerTable = drawer.querySelector(".smurf-drawer-table");
          const empty = drawer.querySelector(".smurf-drawer-empty");

          // Limpiar tabla anterior
          drawerTable.innerHTML = "";
          empty.style.display = "none";
          drawerTable.classList.remove("hidden");

          // Generar tabla de cuentas smurf
          const cuentas = smurfData.cuentas || [];
          if (!cuentas.length) {
            empty.textContent = "No hay cuentas smurf registradas.";
            empty.style.display = "block";
            drawerTable.classList.add("hidden");
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
            drawerTable.innerHTML = html;

            // Doble clic en celdas rojas -> copiar al portapapeles
            drawerTable.querySelectorAll(".elo-higher").forEach((cell) => {
              cell.addEventListener("dblclick", () => {
                const row = cell.closest("tr");
                const headersEls = Array.from(drawerTable.querySelectorAll("thead th"));
                const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
                const columnName = headersEls[colIndex]?.innerText?.trim() || "Columna";
                const value = cell.innerText?.trim() || "";

                // Buscar la celda que contiene el nombre de la cuenta Smurf
                let accountName = "Cuenta desconocida";
                const allHeaders = headersEls.map(h => h.innerText.toLowerCase().trim());
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
  const btnVolverBusqueda = casterSection.querySelector(".btn-volver-busqueda");
  const btnVerPartidas = casterSection.querySelector(".btn-ver-partidas");
  const btnToggleElo = casterSection.querySelector(".btn-toggle-elo");

  // Volver a la pantalla de búsqueda, restaurando el último jugador buscado
  if (btnVolverBusqueda) {
    btnVolverBusqueda.addEventListener("click", (e) => {
      e.stopPropagation();
      window.__regresarCasterBuscar = true; // le indica a scriptCasterBuscar.js que restaure la búsqueda
      mostrarSeccion("casterBuscar");
    });
  }

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


  // Toggle único: ELO 1v1 <-> ELO TG (misma barra, cambia el dato mostrado)
  if (btnToggleElo) {
    let mostrando1v1 = true;

    function actualizarColumnaElo() {
      const rangoActivo = mostrando1v1 ? rango1v1 : rangoTG;

      table.querySelectorAll("td.col-elo-bar").forEach((td) => {
        const profileId = Number(td.dataset.profileId);
        const { l1, l2 } = obtenerLeaderboards(profileId);
        const stat = mostrando1v1 ? l1 : l2;
        const fill = td.querySelector(".elo-bar-fill");
        const valor = td.querySelector(".elo-bar-value");
        if (fill) fill.style.width = `${porcentajeEnRango(stat.rating, rangoActivo)}%`;
        if (valor) valor.textContent = formatElo_Partidas(stat.rating);
      });

      table.querySelectorAll("td.col-elo-max").forEach((td) => {
        const profileId = Number(td.dataset.profileId);
        const { l1, l2 } = obtenerLeaderboards(profileId);
        const stat = mostrando1v1 ? l1 : l2;
        const valor = td.querySelector(".elo-max-value");
        if (valor) valor.textContent = formatElo_Partidas(stat.maxRating);
      });

      const tituloColumna = table.querySelector(".elo-column-title");
      if (tituloColumna) tituloColumna.textContent = mostrando1v1 ? "ELO 1v1" : "ELO TG";
    }

    btnToggleElo.addEventListener("click", (e) => {
      e.stopPropagation();
      mostrando1v1 = !mostrando1v1;
      btnToggleElo.textContent = mostrando1v1 ? "Ver TG" : "Ver 1v1";
      actualizarColumnaElo();
    });
  }


  // Acción de cierre
  drawer.querySelector(".smurf-drawer-close").addEventListener("click", () => {
    drawer.classList.remove("open");
  });


  // 🔹 Cierre automático del drawer
  // (quitamos los listeners de la vez anterior antes de crear los nuevos,
  // ya que initCasterSection() ahora puede volver a ejecutarse cuando el
  // monitoreo automático detecta una partida más reciente)
  if (sectionChangeDrawerListener) {
    document.removeEventListener("sectionChange", sectionChangeDrawerListener);
  }
  if (outsideClickDrawerListener) {
    document.removeEventListener("click", outsideClickDrawerListener);
  }

  // 1️⃣ Si el usuario cambia de sección
  sectionChangeDrawerListener = (e) => {
    if (e.detail !== "caster") {
      drawer.classList.remove("open");
    }
  };
  document.addEventListener("sectionChange", sectionChangeDrawerListener);

  // 2️⃣ Si el usuario hace clic fuera del área del drawer
  outsideClickDrawerListener = (event) => {
    const isClickInsideDrawer = drawer.contains(event.target);
    const isClickOnSmurfButton = event.target.closest(".smurf-si");
    if (!isClickInsideDrawer && !isClickOnSmurfButton) {
      drawer.classList.remove("open");
    }
  };
  document.addEventListener("click", outsideClickDrawerListener);

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

  // 🔹 Iniciar el monitoreo automático de nuevas partidas para este dashboard
  iniciarMonitoreoDashboard();
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
// Monitoreo automático de partidas más recientes
// =============================

// Inicia (o reinicia) el chequeo periódico cada 10 segundos.
function iniciarMonitoreoDashboard() {
  detenerMonitoreoDashboard(); // evita duplicar intervalos

  const profileId = obtenerProfileIdMonitoreado();
  if (!profileId) return;

  dashboardMonitorInterval = setInterval(() => {
    verificarPartidaMasReciente(profileId);
  }, 10000);
}

function detenerMonitoreoDashboard() {
  if (dashboardMonitorInterval) {
    clearInterval(dashboardMonitorInterval);
    dashboardMonitorInterval = null;
  }
  dashboardMonitorBusy = false;
}

// Determina de qué jugador debemos vigilar sus próximas partidas:
// preferimos el último jugador buscado (definido en scriptCasterBuscar.js);
// si no está disponible, usamos el primer jugador de la partida actual.
function obtenerProfileIdMonitoreado() {
  if (typeof lastCasterSearch !== "undefined" && lastCasterSearch?.profileId) {
    return lastCasterSearch.profileId;
  }
  const teams = dashboardData?.teams || [];
  for (const team of teams) {
    const pid = team?.players?.[0]?.profileId;
    if (pid) return pid;
  }
  return null;
}

async function verificarPartidaMasReciente(profileId) {
  if (dashboardMonitorBusy || !dashboardData) return;
  dashboardMonitorBusy = true;

  try {
    // 🔹 Anti-caché: ver nota en obtenerPartidasCaster() (scriptCasterBuscar.js).
    const url = `https://data.aoe2companion.com/api/matches?direction=forward&profile_ids=${profileId}&search=&leaderboard_ids=&page=1&language=es&_=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const matches = data.matches || [];
    if (!matches.length) return;

    const ultimaPartidaVista = dashboardData;
    const partidaMasReciente = matches[0];

    // ¿Es realmente una partida distinta a la que estamos viendo?
    if (partidaMasReciente.matchId === ultimaPartidaVista.matchId) return;

    if ((partidaMasReciente.teams || []).length > 2) {
      console.warn("⚠️ Se detectó una partida más reciente con más de 2 equipos; no se actualiza el dashboard automáticamente.");
      return;
    }

    mostrarToast("🔄 Se encontró una partida más reciente, actualizando dashboard...", 4000);

    const matchCompleto = await construirDatosCompletosPartida(partidaMasReciente);

    window.dashboardData = matchCompleto;
    sessionStorage.setItem("dashboardData", JSON.stringify(matchCompleto));

    // 🔹 Re-renderizamos el dashboard en el lugar, sin cambiar de sección
    initCasterSection();
  } catch (err) {
    console.error("Error verificando partida más reciente en el dashboard:", err);
  } finally {
    dashboardMonitorBusy = false;
  }
}

// =============================
// Destruir sección
// =============================
function destroyCasterSection() {
  console.log("🚪 Se salió de la sección Caster");
  detenerMonitoreoDashboard();
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
