async function loadStats() {
    try {
        const data = await apiRequest('/v1/items/stats');
        renderStats(data);
    } catch (e) {
        document.getElementById('statsGrid').innerHTML =
            '<p style="color:var(--text-light)">Inicia sesión para ver estadísticas</p>';
    }
}

function renderStats(data) {
    document.getElementById('statReportes').textContent = data.total_reportes || 0;
    document.getElementById('statHoy').textContent = data.reportes_hoy || 0;
    document.getElementById('statZonas').textContent = data.total_zonas || 0;
    document.getElementById('statZonasActivas').textContent = data.zonas_activas || 0;

    const maxTipo = Math.max(...(data.por_tipo?.map(t => t.count) || [1]));
    const tipoEl = document.getElementById('chartTipo');
    tipoEl.innerHTML = (data.por_tipo || []).map(t => `
        <div class="chart-item">
            <span>${t.tipo}</span>
            <span><strong>${t.count}</strong></span>
        </div>
        <div class="chart-bar" style="width:${(t.count / maxTipo) * 100}%"></div>
    `).join('') || '<p style="color:var(--text-light);font-size:0.85rem">Sin datos</p>';

    const maxEstado = Math.max(...(data.por_estado?.map(e => e.count) || [1]));
    const estadoEl = document.getElementById('chartEstado');
    estadoEl.innerHTML = (data.por_estado || []).map(e => `
        <div class="chart-item">
            <span>${e.estado}</span>
            <span><strong>${e.count}</strong></span>
        </div>
        <div class="chart-bar" style="width:${(e.count / maxEstado) * 100}%"></div>
    `).join('') || '<p style="color:var(--text-light);font-size:0.85rem">Sin datos</p>';

    const ultimosEl = document.getElementById('ultimosReportes');
    ultimosEl.innerHTML = (data.ultimos || []).map(r => `
        <div class="report-item">
            <span>${r.tipo} <span class="meta">por ${r.usuario}</span></span>
            <span class="meta">${new Date(r.creado).toLocaleString('es-CO')}</span>
        </div>
    `).join('') || '<p style="color:var(--text-light);font-size:0.85rem">Sin reportes recientes</p>';
}
