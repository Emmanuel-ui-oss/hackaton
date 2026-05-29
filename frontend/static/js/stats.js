async function loadStats() {
    try {
        const data = await apiRequest('/v1/items/stats');
        renderStats(data);
    } catch (e) {
        document.getElementById('statsGrid').innerHTML =
            '<p style="color:var(--text-light)">Inicia sesión para ver estadísticas</p>';
    }
}

let chartTipo = null, chartEstado = null

function renderStats(data) {
    document.getElementById('statReportes').textContent = data.total_reportes || 0;
    document.getElementById('statHoy').textContent = data.reportes_hoy || 0;
    document.getElementById('statZonas').textContent = data.total_zonas || 0;
    document.getElementById('statZonasActivas').textContent = data.zonas_activas || 0;

    const tipos = data.por_tipo || []
    if (chartTipo) { chartTipo.destroy() }
    const ctxTipo = document.getElementById('chartTipo')
    if (tipos.length) {
      ctxTipo.innerHTML = '<canvas height="180"></canvas>'
      chartTipo = new Chart(ctxTipo.querySelector('canvas'), {
        type: 'doughnut',
        data: {
          labels: tipos.map(t => t.tipo),
          datasets: [{
            data: tipos.map(t => t.count),
            backgroundColor: ['#E53935','#F57F17','#FBC02D','#1565C0','#2E7D32','#9E9E9E'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
        }
      })
    } else {
      ctxTipo.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem">Sin datos</p>'
    }

    const estados = data.por_estado || []
    if (chartEstado) { chartEstado.destroy() }
    const ctxEstado = document.getElementById('chartEstado')
    if (estados.length) {
      ctxEstado.innerHTML = '<canvas height="180"></canvas>'
      chartEstado = new Chart(ctxEstado.querySelector('canvas'), {
        type: 'bar',
        data: {
          labels: estados.map(e => e.estado),
          datasets: [{
            label: 'Reportes',
            data: estados.map(e => e.count),
            backgroundColor: ['#1565C0','#F57F17','#2E7D32','#E53935','#9E9E9E'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } }
          }
        }
      })
    } else {
      ctxEstado.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem">Sin datos</p>'
    }

    const ultimosEl = document.getElementById('ultimosReportes');
    ultimosEl.innerHTML = (data.ultimos || []).map(r => `
        <div class="report-item">
            <span>${r.tipo} <span class="meta">por ${r.usuario}</span></span>
            <span class="meta">${new Date(r.creado).toLocaleString('es-CO')}</span>
        </div>
    `).join('') || '<p style="color:var(--text-light);font-size:0.85rem">Sin reportes recientes</p>';
}
