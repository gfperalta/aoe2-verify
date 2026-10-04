// =============================
// Lógica de la sección: Validación de jugadores
// =============================

function initJugadoresSection() {
  const jugadoresSection = document.getElementById("jugadores");
  if (!jugadoresSection) return;

  jugadoresSection.innerHTML = `
    <div class="page-head">
      <h2 class="page-title">Extraer data de jugadores</h2>
      <p class="page-sub">Para organizadores de torneos: importa códigos Companion y descarga todo en un CSV.</p>
    </div>

    <div class="validacion-root">
      <div class="card validacion-top">
        <div class="validacion-toolbar">
          <ol class="steps">
            <li><span>1</span>Un código Companion por línea (.txt)</li>
            <li><span>2</span>Máximo 100 jugadores</li>
            <li><span>3</span>Exporta el resultado a CSV</li>
          </ol>
          <div class="validacion-buttons">
            <button id="btnImportar" class="btn btn-primary" type="button">${icono("upload", 18)}Importar .txt</button>
            <button id="btnExportar" class="btn btn-ghost" type="button" disabled>${icono("download", 18)}Exportar CSV</button>
          </div>
        </div>

        <div class="progress-area" id="progressArea">
          <div class="progress-text" id="progressText">Procesando: 0 / 0</div>
          <div class="progress-bar-outer">
            <div class="progress-bar-inner" id="progressInner" style="width:0%"></div>
          </div>
        </div>
      </div>

      <div id="validacionTableWrap" class="card validacion-table-container"></div>
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
          <th rowspan="2">#</th><th rowspan="2">Nick</th><th rowspan="2">Código Companion</th><th rowspan="2">País</th><th rowspan="2">Clan</th>
          <th class="grp" colspan="4">1v1</th><th class="grp g" colspan="4">Team Game</th>
          <th rowspan="2">Cuentas Smurf</th>
        </tr>
        <tr>
          <th class="r">ELO</th><th class="r">Máx.</th><th class="r">Partidas</th><th class="r">Ganadas</th>
          <th class="r">ELO</th><th class="r">Máx.</th><th class="r">Partidas</th><th class="r">Ganadas</th>
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

    // 🔹 Cuentas smurf: un resumen ("N cuentas") que se despliega con los
    // enlaces de todas ellas (puede haber varias)
    const listaSmurf = r.smurfsList || [];
    const smurfLinks = listaSmurf.length
      ? `<details class="smurf-ids">
           <summary class="chip gold">${icono("warn", 13)}${listaSmurf.length} ${listaSmurf.length === 1 ? "cuenta" : "cuentas"}</summary>
           <div class="ids">${listaSmurf
             .map(id => `<a href="https://aoe2companion.com/profile/${id}" target="_blank" rel="noopener noreferrer" class="companion-link">${escapeHtml(id)}</a>`)
             .join("")}</div>
         </details>`
      : '<span class="smurf-none">—</span>';

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(r.nick ?? "")}</td>
      <td>${enlaceCompanion}</td>
      <td>${escapeHtml(r.pais || "")}</td>
      <td>${escapeHtml(r.clan || "")}</td>
      <td class="r num">${r.elo1v1 ?? ""}</td>
      <td class="r num">${r.max1v1 ?? ""}</td>
      <td class="r num">${r.games1v1 ?? ""}</td>
      <td class="r num">${r.wins1v1 ?? ""}</td>
      <td class="r num">${r.eloTG ?? ""}</td>
      <td class="r num">${r.maxTG ?? ""}</td>
      <td class="r num">${r.gamesTG ?? ""}</td>
      <td class="r num">${r.winsTG ?? ""}</td>
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
      progressArea.style.display = "flex";
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
