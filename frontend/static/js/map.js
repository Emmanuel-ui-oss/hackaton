const MEDELLIN = { lat: 6.2476, lng: -75.5658 };
const POLL_INTERVAL = 60000;
const NIVEL_COLORS = { critico: '#D32F2F', alto: '#F57F17', medio: '#FBC02D', bajo: '#388E3C' };
const NIVEL_OPACITY = { critico: 0.45, alto: 0.35, medio: 0.30, bajo: 0.25 };

let map;
let eventLayer = L.layerGroup();
let userMarker = null;
let pollingId = null;
let currentPosition = null;

function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    map = L.map('map', {
        center: [MEDELLIN.lat, MEDELLIN.lng],
        zoom: 13,
        zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);

    eventLayer.addTo(map);

    map.on('moveend', () => {
        if (currentPosition) {
            const center = map.getCenter();
            const dist = map.distance(center, [currentPosition.lat, currentPosition.lng]);
            if (dist > 2000) {
                fetchEvents(center.lat, center.lng);
            }
        }
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                if (userMarker) map.removeLayer(userMarker);
                userMarker = L.circleMarker([currentPosition.lat, currentPosition.lng], {
                    radius: 8, color: '#1565C0', fillColor: '#1565C0', fillOpacity: 1, weight: 3,
                }).addTo(map).bindPopup('📍 Tu ubicación');
                map.setView([currentPosition.lat, currentPosition.lng], 14);
                fetchEvents();
            },
            () => { fetchEvents(); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        fetchEvents();
    }

    startPolling();
    updateEventCount();
}

async function fetchEvents(lat, lng) {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    try {
        const clat = lat || (currentPosition ? currentPosition.lat : MEDELLIN.lat);
        const clng = lng || (currentPosition ? currentPosition.lng : MEDELLIN.lng);
        const resp = await fetch(`${API_BASE}/v1/eventos/near?lat=${clat}&lng=${clng}&radio_km=15`);
        if (!resp.ok) throw new Error('Error');
        const data = await resp.json();
        renderEvents(data.eventos);
        updateEventCount(data.eventos.length);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('es-CO');
    } catch (e) {
        console.error(e);
        loading.textContent = '⚠️ Error al cargar';
        setTimeout(() => { loading.style.display = 'none'; }, 2000);
        return;
    }
    loading.style.display = 'none';
}

function renderEvents(eventos) {
    eventLayer.clearLayers();
    eventos.forEach(ev => {
        const color = NIVEL_COLORS[ev.nivel] || '#F57F17';
        const opacity = NIVEL_OPACITY[ev.nivel] || 0.3;

        L.circle([ev.latitud, ev.longitud], {
            radius: ev.radio_impacto_metros,
            color, fillColor: color, fillOpacity: opacity, weight: 2, opacity: 0.8,
        }).addTo(eventLayer);

        const marker = L.circleMarker([ev.latitud, ev.longitud], {
            radius: 7, color, fillColor: color, fillOpacity: 0.9, weight: 2,
        }).addTo(eventLayer);

        marker.bindTooltip(`${ev.titulo}\n${ev.tipo} · ${ev.nivel}`, { direction: 'top' });
        marker.on('click', () => showEventDetail(ev));
    });
}

function showEventDetail(ev) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('sidebarContent');
    const expira = ev.expira_en ? new Date(ev.expira_en).toLocaleString('es-CO') : 'Sin expiración';

    content.innerHTML = `
        <h2>${ev.titulo}</h2>
        <div class="meta">
            <span class="badge badge-${ev.nivel}">${ev.nivel.toUpperCase()}</span>
            <span class="badge" style="background:#E3F2FD;color:#1565C0">${ev.tipo}</span>
            <span class="badge" style="background:#F3E5F5;color:#7B1FA2">${ev.fuente}</span>
        </div>
        <p class="descripcion">${ev.descripcion || 'Sin descripción'}</p>
        <div class="meta">
            <div>📍 ${ev.latitud.toFixed(4)}, ${ev.longitud.toFixed(4)}</div>
            <div>📏 Radio: ${ev.radio_impacto_metros}m · Distancia: ${ev.distancia_km}km</div>
            <div>⏳ Expira: ${expira}</div>
            <div>🕐 ${new Date(ev.creado).toLocaleString('es-CO')}</div>
        </div>
    `;
    sidebar.classList.remove('closed');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.add('closed');
}

function updateEventCount(count) {
    const el = document.getElementById('eventCount');
    if (el) el.textContent = `${count || 0} eventos`;
}

function startPolling() {
    if (pollingId) return;
    pollingId = setInterval(fetchEvents, POLL_INTERVAL);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
});
