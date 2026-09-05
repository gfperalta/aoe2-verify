// =============================
// Lógica de la sección: Dashboard para Casters (Buscar)
// =============================

let casterInput = null;
let casterResults = null;
let casterContainer = null;
let selectedCasterProfileId = null;

let currentMatches = [];
let currentPage = 0;
let monitorInterval = null;
let monitorActive = false;
let monitorDelay = 10;

// =============================
// Inicializar la sección
// =============================
function initCasterBuscarSection() {
  const section = document.getElementById("casterBuscar");
  if (!section) return;

  section.innerHTML = `
    <div class="caster-header">
      <h2 class="caster-title">Dashboard para Casters</h2>
      <p class="caster-subtitle"></p>
    </div>

    <div class="caster-search">
      <div class="caster-input-group">
        <input
          type="text"
          id="casterInput"
          class="caster-input"
          placeholder="Escribe un nombre de jugador..."
          autocomplete="off"
        />
      </div>
    </div>

    <div id="casterResults" class="caster-results"></div>

    <div class="auto-monitor">
      <label>
        <input type="checkbox" id="autoMonitorCheck" disabled />
        Buscar nuevas partidas cada:
      </label>
      <select id="autoMonitorSelect" disabled>
        <option value="5">5 segundos</option>
        <option value="10" selected>10 segundos</option>
        <option value="20">20 segundos</option>
        <option value="30">30 segundos</option>
        <option value="60">60 segundos</option>
      </select>
      <div id="autoMonitorIndicator" class="auto-monitor-indicator" style="display:none;">
        <div class="spinner-circle"></div>
        <span class="countdown">0</span>
      </div>
    </div>

    <div id="casterMatchesContainer" class="caster-matches-container" style="display:none;"></div>
  `;

  casterInput = document.querySelector("#casterInput");
  casterResults = document.querySelector("#casterResults");
  casterContainer = document.querySelector("#casterMatchesContainer");

  const autoMonitorCheck = document.getElementById("autoMonitorCheck");
  const autoMonitorSelect = document.getElementById("autoMonitorSelect");
  const autoMonitorContainer = document.querySelector(".auto-monitor");

  // 🔹 Estado inicial seguro y consistente
  autoMonitorContainer.style.visibility = "hidden"; // no visible al inicio
  autoMonitorCheck.checked = false;                 // por si acaso
  autoMonitorCheck.disabled = true;                 // checkbox inicialmente inactivo
  autoMonitorSelect.disabled = true;                // select inicialmente inactivo

  // 🔹 Ocultar la sección completa al inicio
  autoMonitorContainer.style.visibility = "hidden";
  document.getElementById("autoMonitorSelect").disabled = true;


  casterInput.addEventListener("input", handleCasterInput);
  document
    .getElementById("autoMonitorCheck")
    .addEventListener("change", toggleAutoMonitor);
  document
    .getElementById("autoMonitorSelect")
    .addEventListener("change", updateMonitorDelay);

  // 🔹 Cuando se escribe algo, desactivar controles y ocultar resultados
  casterInput.addEventListener("input", () => {
    // Ocultar toda la sección de monitoreo (label + checkbox + select)
    autoMonitorContainer.style.visibility = "hidden";
    casterContainer.style.display = "none"; // Mantén el contenedor oculto
  });

  // 🔹 Enfocar y seleccionar texto automáticamente
  casterInput.focus();
  casterInput.select();

  casterInput.addEventListener("focus", () => casterInput.select());
}

// =============================
// Buscar jugador (con debounce)
// =============================
let casterDebounceTimer = null;
function handleCasterInput(e) {
  const query = e.target.value.trim();
  clearTimeout(casterDebounceTimer);
  casterDebounceTimer = setTimeout(() => buscarJugadoresCaster(query), 400);
}

async function buscarJugadoresCaster(query) {
  if (!query || query.length < 3) {
    casterResults.innerHTML = `<div class="hint">Escribe 3 o más caracteres para buscar.</div>`;
    return;
  }
  casterResults.innerHTML = `<div class="hint">Buscando... <span class="loader-circle"></span></div>`;

  try {
    const url = `https://data.aoe2companion.com/api/profiles?search=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url);
    const data = await res.json();
    renderCasterSearchResults(data.profiles || []);
  } catch (e) {
    casterResults.innerHTML = `<div class="hint error">Error: ${e.message}</div>`;
  }
}

// =============================
// Render resultados búsqueda
// =============================
function renderCasterSearchResults(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    casterResults.innerHTML = `<div class="hint">Jugador no encontrado.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  profiles.forEach((p) => {
    const row = document.createElement("div");
    row.className = "search-row";
    row.innerHTML = `
      <div class="sr-left">
        <div class="sr-name">${escapeHtml(p.name)}</div>
        <div class="sr-meta">País: ${escapeHtml(p.country || "-")} • Clan: ${
      p.clan || "-"
    }</div>
      </div>
      <div class="sr-right">ID: ${p.profileId}</div>
    `;
    row.addEventListener("click", () =>
      seleccionarJugadorCaster(p.profileId, p.name)
    );
    frag.appendChild(row);
  });

  casterResults.innerHTML = "";
  casterResults.appendChild(frag);
}

// =============================
// Seleccionar jugador
// =============================
function seleccionarJugadorCaster(profileId, playerName) {
  stopAutoMonitorVisual(); // 🟢 Detiene el monitoreo visual y timers previos

  selectedCasterProfileId = profileId;
  casterInput.value = playerName;
  casterResults.innerHTML = "";

  const autoMonitorContainer = document.querySelector(".auto-monitor");
  const autoMonitorCheck = document.getElementById("autoMonitorCheck");
  const autoMonitorSelect = document.getElementById("autoMonitorSelect");

  // Mostrar el contenedor de resultados siempre (independientemente del check)
  casterContainer.style.display = "block";

  // Habilitar el panel de configuración pero dejar el check marcado y disparar evento
  autoMonitorContainer.style.visibility = "visible";
  autoMonitorCheck.disabled = false;
  autoMonitorCheck.checked = true; // ✅ marcarlo automáticamente
  autoMonitorSelect.disabled = false;

// 🔹 Dispara manualmente el evento "change" para activar toda la lógica
// 🔹 Dar un breve retardo para asegurar inicialización completa
setTimeout(() => {
  autoMonitorCheck.dispatchEvent(new Event("change"));
}, 200);

  // Llamamos a obtenerPartidasCaster: esta función ya se encarga de mostrar "Buscando..."
  obtenerPartidasCaster(profileId);
}



// =============================
// Obtener partidas del jugador
// =============================
async function obtenerPartidasCaster(profileId) {
  if (!profileId) return;

  // Limpiamos timers (si hubiera) para evitar fetchs duplicados en background,
  // pero no tocamos la UI ni ocultamos el contenedor.
  stopAutoMonitorTimers();

  casterContainer.innerHTML = `<div class="hint">Buscando partidas... <span class="loader-circle"></span></div>`;
  casterContainer.style.display = "block"; // aseguramos que el contenedor esté visible
  try {
    const url = `https://data.aoe2companion.com/api/matches?direction=forward&profile_ids=${profileId}&search=&leaderboard_ids=&page=1&language=es`;
    const res = await fetch(url);
    const data = await res.json();
    currentMatches = data.matches || [];
    currentPage = 0;
    renderCasterMatch();
  } catch (e) {
    casterContainer.innerHTML = `<div class="hint error">Error al obtener partidas.</div>`;
  }
}


// =============================
// Render una partida con paginación
// =============================
function renderCasterMatch() {
  casterContainer.innerHTML = "";
  if (!Array.isArray(currentMatches) || currentMatches.length === 0) {
    casterContainer.innerHTML = `<div class="hint">No se encontraron partidas recientes.</div>`;
    return;
  }

  const match = currentMatches[currentPage];
  if (!match) return;

  const teams = match.teams || [];
  let team1 = teams[1]?.players || [];
  let team2 = teams[0]?.players || [];

  // 🔹 Determinar equipo ganador
  let winnerTeam = null;
  if (team1[0]?.won === true) {
    winnerTeam = "team1";
  } else if (team2[0]?.won === true) {
    winnerTeam = "team2";
  }


  // 🔹 Ordenar equipos por color numérico
  team1 = team1.sort((a, b) => (a.color ?? 0) - (b.color ?? 0));
  team2 = team2.sort((a, b) => (a.color ?? 0) - (b.color ?? 0));

  const wrapper = document.createElement("div");
  wrapper.className = "results-layout";

  // 🔹 Contenedor de mapa dividido en 2 columnas con título centrado arriba
const mapBox = document.createElement("div");
mapBox.className = "info-box match-info";
mapBox.innerHTML = `
  <h3 class="info-title">Información de la partida</h3>
  <div class="map-layout">
    <div class="map-left">
      <img src="${match.mapImageUrl}" alt="${match.mapName}" class="map-img" />
    </div>
    <div class="map-right">
      <div>${match.mapName}</div>
      <div>${match.leaderboardName}</div>
      <div>${match.gameModeName}</div>
      <div>
        ${formatearFechaLocal(match.started)}
        ${
          (!match.finished && currentPage === 0)
            ? '<div><span class="live-indicator">EN VIVO</span></div>'
            : ''
        }
      </div>
    </div>
  </div>
`;


const team1Box = createTeamBox("Equipo 1", team1, winnerTeam === "team1");
const team2Box = createTeamBox("Equipo 2", team2, winnerTeam === "team2");


  wrapper.appendChild(mapBox);
  wrapper.appendChild(team1Box);
  wrapper.appendChild(team2Box);

    // Contenedor combinado para paginación + botón dashboard
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination-container";

  const pagination = document.createElement("div");
  pagination.className = "pagination";
  pagination.innerHTML = `
    <button ${currentPage === 0 ? "disabled" : ""} id="prevPage">← Anterior</button>
    <span>Partida ${currentPage + 1} de ${currentMatches.length}</span>
    <button ${
      currentPage === currentMatches.length - 1 ? "disabled" : ""
    } id="nextPage">Siguiente →</button>
  `;

  const dashboardButton = document.createElement("button");
  dashboardButton.id = "btnDashboard";
  dashboardButton.className = "btn-dashboard";
  dashboardButton.textContent = "Ver dashboard";
  dashboardButton.addEventListener("click", () => {
  // 🔹 Aquí se define lo que debe hacer el boton "Ver Dashboard"
  const equipos = match?.teams || [];
  if (equipos.length > 2) {
    alert(
      "⚠️ El sistema actualmente está diseñado para partidas de dos equipos.\n\n" +
      "La partida que está intentando abrir tiene más de dos equipos,\n" +
      "por lo tanto, el Dashboard no se abrirá."
    );
    return;
  }

  //ventana de carga con spiner
  document.getElementById("loader-screen").classList.add("active");

    // ==============================================
  // 🔹 Nueva lógica: Jugadores reales + Smurfs (optimizada)
  // ==============================================
  (async () => {
    try {
      const jugadoresReales = [];
      let smurfData = [];

      if (match?.teams && Array.isArray(match.teams)) {
        // ==============================
        // 1️⃣ Obtener jugadores reales
        // ==============================
        for (const team of match.teams) {
          if (!team?.players) continue;

          for (const player of team.players) {
            const profileId = player?.profileId;
            if (!profileId) continue;

            const url = `https://data.aoe2companion.com/api/profiles/${encodeURIComponent(
              profileId
            )}?language=es&extend=stats%2Cprofiles.avatar_medium_url%2Cprofiles.avatar_full_url&page=1`;

            try {
              const res = await fetch(url);
              const data = await res.json();
              jugadoresReales.push(data);
            } catch (err) {
              console.error("Error obteniendo jugador real:", profileId, err);
            }
          }
        }

        // ==============================
        // 2️⃣ Obtener cuentas Smurf (ahora en paralelo)
        // ==============================
        async function obtenerSmurfsParaJugador(profileId) {
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

            const lb1v1 = dataCuenta.leaderboards?.find(l => l.leaderboardId === "rm_1v1") || {};
            const lbTG = dataCuenta.leaderboards?.find(l => l.leaderboardId === "rm_team") || {};

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
          return matriz;
        }

        // 🔹 Ejecutar las búsquedas Smurf en paralelo
        const smurfPromises = [];

        for (const team of match.teams) {
          if (!team?.players) continue;

          for (const player of team.players) {
            const pid = player?.profileId;
            if (!pid) continue;

            smurfPromises.push(
              obtenerSmurfsParaJugador(pid).then(cuentas => ({
                jugadorId: pid,
                cuentas
              }))
            );
          }
        }

        smurfData = await Promise.all(smurfPromises);


        

        // ==============================
        // 3️⃣ Guardar en el objeto match
        // ==============================
        match.jugadoresReales = jugadoresReales;
        match.Smurf = smurfData;

        console.log("✅ jugadoresReales:", jugadoresReales);
        console.log("✅ Smurf:", smurfData);

        //Se oculta la ventana de cargando
        document.getElementById("loader-screen").classList.remove("active");

        // ==============================
        // 4️⃣ Guardar el arreglo y abrir la nueva sección
        // ==============================

        // 🔹 Guardamos el match completo (con jugadoresReales y Smurf) en memoria global
        window.dashboardData = match;

        // 🔹 También puedes guardarlo en sessionStorage por si recargas la página
        sessionStorage.setItem("dashboardData", JSON.stringify(match));

        // 🔹 Disparamos el cambio de sección hacia "caster"
        document.dispatchEvent(new CustomEvent("sectionChange", { detail: "caster" }));

        // ==============================
        // 4️⃣ Descargar JSON final
        // ==============================
        /*const dataStr = JSON.stringify(match, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `partida_${match.matchId || "sin_id"}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);*/

      } else {
        alert("⚠️ No se encontraron equipos o jugadores en la partida.");
      }
    } catch (err) {
      console.error("Error general al obtener datos de jugadores reales y smurfs:", err);
      alert("❌ Error al obtener los datos.");
    }
  })();

});






  paginationContainer.appendChild(pagination);
  paginationContainer.appendChild(dashboardButton);

  casterContainer.appendChild(wrapper);
  casterContainer.appendChild(paginationContainer);


  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      renderCasterMatch();
    }
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < currentMatches.length - 1) {
      currentPage++;
      renderCasterMatch();
    }
  });
}

// =============================
// Crear tarjeta de equipo
// =============================
function createTeamBox(title, players, isWinner = false) {
  const box = document.createElement("div");
  box.className = "info-box team";

  // 🔹 Agregar corona si el equipo ganó
  const crown = isWinner ? ' <img src="Img/crown.png" alt="Ganador" class="winner-crown">' : "";

  box.innerHTML = `<h3 class="info-title">${title}${crown}</h3>`;
  players.forEach((p) => {
    const card = document.createElement("div");
    card.className = "team-card";
    card.innerHTML = `
      <div class="player-left">
        <div class="player-color" style="background:${p.colorHex}"></div>
        <img src="${p.civImageUrl}" alt="${p.civName}" class="civ-logo" title="${p.civName}" />
        <div class="player-meta">
          <div class="player-name">${escapeHtml(p.name)}</div>
          <div class="player-clan">${escapeHtml(p.clan || "")}</div>
        </div>
      </div>
      <div class="player-elo" title="Elo partida">${escapeHtml(p.rating)}</div>
`;
    box.appendChild(card);
  });
  return box;
}

// =============================
// Monitoreo automático
// =============================
function toggleAutoMonitor(e) {
  monitorActive = e.target.checked;

  clearInterval(monitorInterval);
  clearInterval(window.countdownTimer);

  const autoMonitorSelect = document.getElementById("autoMonitorSelect");
  const indicator = document.getElementById("autoMonitorIndicator");
  const countdownText = indicator.querySelector(".countdown");

  // Si el check se apaga → detener todo y ocultar
  if (!monitorActive) {
    indicator.style.display = "none";
    indicator.classList.remove("spinning");
    countdownText.textContent = "0";
    autoMonitorSelect.disabled = true;
    return;
  }

  // Si se enciende → activar monitoreo
  autoMonitorSelect.disabled = false;
  indicator.style.display = "flex";
  indicator.classList.add("spinning");

  startCountdownAnimation(monitorDelay, countdownText, indicator);
  checkForUpdates(); // ejecución inmediata
  monitorInterval = setInterval(checkForUpdates, monitorDelay * 1000);
}






function updateMonitorDelay(e) {
  monitorDelay = Number(e.target.value);

  const indicator = document.getElementById("autoMonitorIndicator");
  const countdownText = indicator.querySelector(".countdown");

  if (monitorActive) {
    // 🔹 Detenemos los timers actuales
    clearInterval(monitorInterval);
    clearInterval(window.countdownTimer);

    // 🔹 Reiniciamos todo con el nuevo valor
    startCountdownAnimation(monitorDelay, countdownText, indicator);
    checkForUpdates(); // Hace una búsqueda inmediata
    monitorInterval = setInterval(checkForUpdates, monitorDelay * 1000);
  }
}


function startCountdownAnimation(seconds, countdownText, indicator) {
  let remaining = seconds;
  countdownText.textContent = remaining;
  indicator.classList.add("spinning");

  window.countdownTimer = setInterval(() => {
    remaining--;
    countdownText.textContent = remaining;

    if (remaining <= 0) {
      remaining = seconds; // reinicia el contador
    }
  }, 1000);
}




async function checkForUpdates() {
  if (!selectedCasterProfileId) return;
  try {
    const url = `https://data.aoe2companion.com/api/matches?direction=forward&profile_ids=${selectedCasterProfileId}&search=&leaderboard_ids=&page=1&language=es`;
    const res = await fetch(url);
    const data = await res.json();
    const matches = data.matches || [];

    if (!matches.length) return;

    const lastKnown = currentMatches[0];
    const latest = matches[0];

    // 🔹 1️⃣ Si hay una nueva partida, refrescar
    const isNewMatch = !lastKnown || latest.matchId !== lastKnown.matchId;

    // 🔹 2️⃣ Si es la misma partida pero cambió de estado (por ejemplo terminó), refrescar también
    const matchStateChanged =
      lastKnown &&
      latest.matchId === lastKnown.matchId &&
      lastKnown.finished !== latest.finished;

    if (isNewMatch || matchStateChanged) {
      currentMatches = matches;
      currentPage = 0;
      renderCasterMatch();

      // Esperar un pequeño retardo para que el botón "Ver dashboard" exista en el DOM
      setTimeout(() => {
        const btn = document.getElementById("btnDashboard");
        if (btn) showNewMatchToast(btn);
      }, 400);
    }

  } catch (err) {
    console.error("Error en checkForUpdates:", err);
  }
}



// Sólo detiene timers y resetea estado lógico — NO modifica la UI
function stopAutoMonitorTimers() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  if (window.countdownTimer) {
    clearInterval(window.countdownTimer);
    window.countdownTimer = null;
  }
  monitorActive = false;
}

// Detiene timers y además limpia la UI del indicador (usar sólo cuando realmente quieres ocultar la UI)
function stopAutoMonitorVisual() {
  stopAutoMonitorTimers();

  const check = document.getElementById("autoMonitorCheck");
  const select = document.getElementById("autoMonitorSelect");
  const indicator = document.getElementById("autoMonitorIndicator");

  if (check) check.checked = false;
  if (select) select.disabled = true;

  if (indicator) {
    indicator.style.display = "none";
    indicator.classList.remove("spinning");
    const countdown = indicator.querySelector(".countdown");
    if (countdown) countdown.textContent = "0";
  }
}




// =============================
// Destruir sección
// =============================
function destroyCasterBuscarSection() {
  clearInterval(monitorInterval);
  clearInterval(window.countdownTimer);

  const indicator = document.getElementById("autoMonitorIndicator");
  if (indicator) {
    indicator.style.display = "none";
    indicator.classList.remove("spinning");
  }

  const check = document.getElementById("autoMonitorCheck");
  const select = document.getElementById("autoMonitorSelect");
  if (check) check.checked = false;
  if (select) select.disabled = true;

  casterInput = null;
  casterResults = null;
  casterContainer = null;
  selectedCasterProfileId = null;
  currentMatches = [];
  currentPage = 0;
  monitorActive = false;
}


// =============================
// Listener de cambio de sección
// =============================
document.addEventListener("sectionChange", (e) => {
  if (e.detail === "casterBuscar") {
    initCasterBuscarSection();

    // 🔹 Si ya hay un jugador seleccionado, activar automáticamente el monitoreo
    if (selectedCasterProfileId) {
      const check = document.getElementById("autoMonitorCheck");
      if (check) {
        check.checked = true;
        check.dispatchEvent(new Event("change")); // simula clic real
      }
    }
  } else {
    destroyCasterBuscarSection();
  }
});



// =============================
// Notificación de nueva partida (toast centrado)
// =============================
let toastTimer = null;
let tickAudioCtx = null;

function showNewMatchToast(dashboardButton) {
  // Evitar duplicados
  if (document.getElementById("newMatchToast")) return;

  // Crear capa de fondo oscurecida
  const overlay = document.createElement("div");
  overlay.id = "toastOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(3px)"
  });

  // Crear toast
  const toast = document.createElement("div");
  toast.id = "newMatchToast";
  Object.assign(toast.style, {
    background: "#1c1c1c",
    color: "#fff",
    padding: "24px 32px",
    borderRadius: "12px",
    boxShadow: "0 0 20px rgba(0,0,0,0.5)",
    textAlign: "center",
    fontSize: "16px",
    maxWidth: "400px",
    lineHeight: "1.6",
    border: "1px solid #333",
  });

  const countdown = document.createElement("span");
  countdown.style.fontWeight = "bold";
  countdown.style.fontSize = "18px";

  let remaining = 10;
  countdown.textContent = remaining;

  toast.innerHTML = `
    <div>⚡ Se encontró una nueva partida.<br>Se abrirá el dashboard en <span id="toastCountdown">${remaining}</span> segundos.</div>
    <br>
  `;

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancelar";
  Object.assign(cancelBtn.style, {
    background: "#333",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  });
  cancelBtn.addEventListener("mouseenter", () => cancelBtn.style.background = "#555");
  cancelBtn.addEventListener("mouseleave", () => cancelBtn.style.background = "#333");

  cancelBtn.addEventListener("click", () => {
    clearInterval(toastTimer);
    overlay.remove();
  });

  toast.appendChild(cancelBtn);
  overlay.appendChild(toast);
  document.body.appendChild(overlay);

  // Reproducir tick cada segundo (Web Audio API)
  tickAudioCtx = tickAudioCtx || new (window.AudioContext || window.webkitAudioContext)();

  function playTick() {
    const osc = tickAudioCtx.createOscillator();
    const gain = tickAudioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(900, tickAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, tickAudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(tickAudioCtx.destination);
    osc.start();
    osc.stop(tickAudioCtx.currentTime + 0.05);
  }

  // Iniciar cuenta regresiva
  toastTimer = setInterval(() => {
    remaining--;
    document.getElementById("toastCountdown").textContent = remaining;
    playTick();

    if (remaining <= 0) {
      clearInterval(toastTimer);
      overlay.remove();
      if (dashboardButton) dashboardButton.click();
    }
  }, 1000);
}




// =============================
// Utilidad
// =============================
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
      m
    ];
  });
}


// =============================
// Formatear fecha a hora local del usuario (dd/mm/aaaa hh:mm am/pm)
// =============================
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

  // Convertimos la fecha al formato local
  let texto = fecha.toLocaleString("es-ES", opciones);

  // Eliminamos la coma entre fecha y hora
  texto = texto.replace(",", "");

  // Reemplazamos "a. m." y "p. m." por "am" / "pm"
  texto = texto
    .replace(/\s*a\.?\s*m\.?/i, " am")
    .replace(/\s*p\.?\s*m\.?/i, " pm");

  return texto.trim();
}


// =============================
// Control visual de cambio de secciones
// =============================
document.addEventListener("sectionChange", (e) => {
  const target = e.detail; // ejemplo: "caster" o "casterBuscar"
  const sections = document.querySelectorAll(".content-section");

  sections.forEach(sec => {
    if (sec.id === target) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });
});
