// =============================
// Lógica de la sección: Validación de jugadores
// =============================

function initJugadoresSection() {
  const jugadoresSection = document.getElementById("jugadores");
  if (!jugadoresSection) return;

  jugadoresSection.innerHTML = `
    <div class="smurf-header">
      <h2 class="smurf-title">Extraer data de jugadores</h2>
      <p class="smurf-subtitle"></p>
    </div>

    <div class="validacion-root">
      <div class="validacion-buttons">
        <button id="btnImportar" class="card-btn">Importar…</button>
        <button id="btnExportar" class="card-btn" disabled>Exportar</button>
      </div>

      <div class="progress-area" id="progressArea" style="display:none;">
        <div class="progress-text" id="progressText">Procesando: 0 / 0</div>
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" id="progressInner" style="width:0%"></div>
        </div>
      </div>

      <!-- 🔹 Mensaje explicativo -->
      <div id="mensajeInstrucciones" class="validacion-info-box">
        <p>
          🧩 <strong>Instrucciones de uso:</strong><br>
          Herramienta diseñada para <strong>organizadores de torneos</strong> que permite <strong>extraer masivamente la información de jugadores</strong> a partir de un <strong>archivo de texto plano (.txt)</strong>.<br><br>
          El archivo debe contener <strong>un código de jugador "Código Companion" por cada línea (Máximo 100 jugadores)</strong>.<br><br>
          Por cada jugador, se extraerá la siguiente información:<br>
          <strong>Nickname</strong>, <strong>Código Companion</strong>, <strong>País</strong>, <strong>Clan</strong>, <strong>Elo 1v1 actual</strong>, <strong>Elo 1v1 máximo alcanzado</strong>, <strong>Total de partidas 1v1</strong>, <strong>Partidas ganadas 1v1</strong>, <strong>Elo TG actual</strong>, <strong>Elo TG máximo alcanzado</strong>, <strong>Total de partidas TG</strong>, <strong>Partidas ganadas TG</strong> y la <strong>lista de cuentas Smurf</strong> asociadas al jugador.
        </p>
      </div>

      <div id="validacionTableWrap" class="validacion-table-container"></div>
    </div>
  `;

  // ================================
  // Variables y elementos
  // ================================
  const btnImportar = document.getElementById("btnImportar");
  const btnExportar = document.getElementById("btnExportar");
  const tableWrap = document.getElementById("validacionTableWrap");
  const progressArea = document.getElementById("progressArea");
  const progressText = document.getElementById("progressText");
  const progressInner = document.getElementById("progressInner");
  const mensajeInstrucciones = document.getElementById("mensajeInstrucciones");

  let currentRows = [];
  let isProcessing = false;

  function limpiarTablaYEstado() {
    currentRows = [];
    tableWrap.innerHTML = "";
    btnExportar.disabled = true;
  }

  limpiarTablaYEstado();

  function crearTablaBase() {
    const table = document.createElement("table");
    table.className = "smurf-table validacion-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th><th>Nick</th><th>Código Companion</th><th>País</th><th>Clan</th>
          <th>Elo 1v1</th><th>Elo Máx 1v1</th><th>Partidas 1v1</th><th>Ganadas 1v1</th>
          <th>Elo TG</th><th>Elo Máx TG</th><th>Partidas TG</th><th>Ganadas TG</th>
          <th>Cuentas Smurf</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    tableWrap.innerHTML = "";
    tableWrap.appendChild(table);
    return table;
  }

  function renderizarTabla() {
  const table = tableWrap.querySelector("table") || crearTablaBase();
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  currentRows.forEach((r, i) => {
    const tr = document.createElement("tr");

    // 🔹 Generar enlace al perfil principal
    const enlaceCompanion = r.companion
      ? `<a href="https://aoe2companion.com/profile/${r.companion}"
            target="_blank"
            rel="noopener noreferrer"
            class="companion-link">${escapeHtml(r.companion)}</a>`
      : "";

    // 🔹 Generar enlaces para las cuentas smurf (si existen)
    const smurfLinks = (r.smurfsList || [])
      .map(id => `<a href="https://aoe2companion.com/profile/${id}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="companion-link">${escapeHtml(id)}</a>`)
      .join(", ");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.nick ?? "")}</td>
      <td>${enlaceCompanion}</td>
      <td>${escapeHtml(r.pais || "")}</td>
      <td>${escapeHtml(r.clan || "")}</td>
      <td>${r.elo1v1 ?? ""}</td>
      <td>${r.max1v1 ?? ""}</td>
      <td>${r.games1v1 ?? ""}</td>
      <td>${r.wins1v1 ?? ""}</td>
      <td>${r.eloTG ?? ""}</td>
      <td>${r.maxTG ?? ""}</td>
      <td>${r.gamesTG ?? ""}</td>
      <td>${r.winsTG ?? ""}</td>
      <td>${smurfLinks}</td>
    `;

    tbody.appendChild(tr);
  });

  // 🚫 Solo habilitamos exportar si hay filas y no se está procesando
  btnExportar.disabled = currentRows.length === 0 || isProcessing;
}


  async function fetchProfileById(companionId) {
    if (!companionId) return null;
    const url = `https://data.aoe2companion.com/api/profiles/${encodeURIComponent(companionId)}?language=es&extend=stats&page=1`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("No encontrado");
      return await res.json();
    } catch {
      return null;
    }
  }

  async function obtenerCuentasFamiliares(rootId) {
    const visitados = new Set();
    const resultados = new Set();

    async function procesar(pid) {
      pid = String(pid).trim();
      if (!pid || visitados.has(pid)) return;
      visitados.add(pid);

      const data = await fetchProfileById(pid);
      if (!data) return;

      const linked = data.linkedProfiles || (data.params && data.params.linkedProfiles) || [];
      for (const l of linked) {
        const hijoId = l?.profileId ?? l?.id ?? null;
        if (hijoId && !visitados.has(String(hijoId))) {
          resultados.add(String(hijoId));
          await procesar(String(hijoId));
        }
      }
    }

    await procesar(rootId);
    resultados.delete(String(rootId));
    return Array.from(resultados);
  }

  const escapeHtml = (str) =>
    String(str || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));






  // ============================
  // Extracción de data
  // ============================
  btnImportar.addEventListener("click", async () => {
    if (isProcessing) return;

    // 🔹 Ocultar mensaje al iniciar el proceso
    if (mensajeInstrucciones) mensajeInstrucciones.style.display = "none";

    isProcessing = true;
    btnImportar.disabled = true;
    btnExportar.disabled = true;

    limpiarTablaYEstado();
    crearTablaBase();

    const inputFile = document.createElement("input");
    inputFile.type = "file";
    inputFile.accept = ".txt";
    inputFile.style.display = "none";
    document.body.appendChild(inputFile);

    inputFile.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return finalizarProceso("Importación cancelada.");

      if (!file.name.toLowerCase().endsWith(".txt"))
        return finalizarProceso("El archivo debe ser .txt (texto plano).");

      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return finalizarProceso("El archivo está vacío.");

      const total = Math.min(100, lines.length);
      progressArea.style.display = "block";
      progressInner.style.width = "0%";
      progressText.textContent = `Procesando: 0 / ${total}`;

      for (let i = 0; i < total; i++) {
        const companionCode = lines[i];
        let row = { companion: companionCode, nick: "No encontrado" };

        const data = await fetchProfileById(companionCode);
        if (data) {
          const lb1v1 = data.leaderboards?.find(l => l.leaderboardId === "rm_1v1") || {};
          const lbTG = data.leaderboards?.find(l => l.leaderboardId === "rm_team") || {};
          row = {
            companion: companionCode,
            nick: data.name || "",
            pais: data.countryName || data.country || "",
            clan: data.clan || "",
            elo1v1: lb1v1.rating ?? "",
            max1v1: lb1v1.maxRating ?? "",
            games1v1: lb1v1.games ?? "",
            wins1v1: lb1v1.wins ?? lb1v1.winsCount ?? 0,
            eloTG: lbTG.rating ?? "",
            maxTG: lbTG.maxRating ?? "",
            gamesTG: lbTG.games ?? "",
            winsTG: lbTG.wins ?? lbTG.winsCount ?? 0,
            smurfsList: await obtenerCuentasFamiliares(companionCode)
          };
        }

        currentRows.push(row);
        renderizarTabla();

        const percent = Math.round(((i + 1) / total) * 100);
        progressInner.style.width = `${percent}%`;
        progressText.textContent = `Procesando: ${i + 1} / ${total}`;
        await sleep(150);
      }

      progressText.textContent = `Finalizado: ${currentRows.length} registros procesados.`;
      progressInner.style.width = "100%";
      setTimeout(() => (progressArea.style.display = "none"), 2500);

      finalizarProceso();
    });

    inputFile.click();

    function finalizarProceso(msg) {
      if (msg) alert(msg);
      isProcessing = false;
      btnImportar.disabled = false;
      renderizarTabla();
      inputFile.remove();
    }
  });

  
  // Exportar CSV para Excel
    btnExportar.addEventListener("click", () => {
    if (currentRows.length === 0 || isProcessing) return alert("No hay registros para exportar.");

    const sep = ";";
    const headers = [
      "N","Nick","Código Companion","País","Clan","Elo 1v1","Elo Máx 1v1","Partidas 1v1","Ganadas 1v1",
      "Elo TG","Elo Máx TG","Partidas TG","Ganadas TG","Cuentas Smurf"
    ];

    const rows = currentRows.map((r, i) => [
      i + 1, r.nick ?? "", r.companion ?? "", r.pais ?? "", r.clan ?? "",
      r.elo1v1 ?? "", r.max1v1 ?? "", r.games1v1 ?? "", r.wins1v1 ?? "",
      r.eloTG ?? "", r.maxTG ?? "", r.gamesTG ?? "", r.winsTG ?? "",
      (r.smurfsList || []).join(", ")
    ]);

    const csv = [headers.join(sep), ...rows.map(r => r.map(c => {
      const s = String(c ?? "");
      return s.includes(sep) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(sep))].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validacion_players_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function destroyJugadoresSection() {
  console.log("🚪 Se salió de la sección Validación de jugadores");
}

document.addEventListener("sectionChange", (e) => {
  if (e.detail === "jugadores") initJugadoresSection();
  else destroyJugadoresSection();
});
