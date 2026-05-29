/**
 * main.js — LOMA
 * Navegación SPA, mapa Leaflet y lógica de interacción.
 */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // NAVEGACIÓN SPA — cambio de vistas
    // (debe ir ANTES del mapa para que view-mapa
    //  esté activa y visible cuando Leaflet mida)
    // =========================================
    const navItems      = document.querySelectorAll('.nav-item[data-target]');
    const views         = document.querySelectorAll('.app-view');
    const btnSOSGlobal  = document.getElementById('btn-sos-global');

    let mapInitialized = false;

    function showView(targetId) {
        views.forEach(v => v.classList.remove('active'));
        navItems.forEach(n => n.classList.remove('active'));

        const targetView = document.getElementById(targetId);
        const targetNav  = document.querySelector(`.nav-item[data-target="${targetId}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetNav)  targetNav.classList.add('active');

        if (targetId === 'view-mapa') {
            btnSOSGlobal.classList.add('d-none');
            // Invalidar tamaño cada vez que se vuelve al mapa
            if (mapInitialized) {
                setTimeout(() => map.invalidateSize(), 50);
            }
        } else {
            btnSOSGlobal.classList.remove('d-none');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            showView(item.dataset.target);
        });
    });

    // Activar vista mapa primero
    showView('view-mapa');


    // =========================================
    // MAPA — Leaflet centrado en Medellín
    // Se inicializa DESPUÉS de que view-mapa
    // esté visible para que Leaflet mida bien.
    // =========================================
    const MEDELLIN = [6.2442, -75.5812];

    const map = L.map('map-view', {
        center: MEDELLIN,
        zoom: 13,
        zoomControl: false,
        attributionControl: true
    });

    // Tiles OpenStreetMap (gratuito, sin API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    // Marcador de posición actual
    const iconPos = L.divIcon({
        className: '',
        html: `<div style="
            width: 18px; height: 18px;
            background: #0D9488;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });

    L.marker(MEDELLIN, { icon: iconPos })
        .addTo(map)
        .bindPopup('<b>Tu ubicación</b><br>Parque Lleras, El Poblado')
        .openPopup();

    mapInitialized = true;

    // Forzar recálculo inmediato por si el contenedor tardó en pintar
    requestAnimationFrame(() => {
        map.invalidateSize();
    });

    // ── Evitar que Leaflet intercepte clicks en elementos flotantes ──
    // Sin esto, Leaflet "come" los eventos de click del toast y el
    // botón de cerrar nunca dispara su listener.
    const floatingEls = [
        document.getElementById('alert-toast'),
        document.querySelector('.search-card'),
        document.getElementById('btn-sos'),
    ];
    floatingEls.forEach(el => {
        if (el) {
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
        }
    });


    // =========================================
    // ICONOS DE TRANSPORTE — borde activo
    // =========================================
    const transportIcons = document.querySelectorAll('#transport-selector i');

    transportIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            transportIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            // TODO: filtrar rutas según icon.dataset.mode
        });
    });


    // =========================================
    // ALERTA FLOTANTE — cerrar
    // =========================================
    const alertToast    = document.getElementById('alert-toast');
    const btnCloseAlert = document.getElementById('btn-close-alert');

    if (btnCloseAlert && alertToast) {
        btnCloseAlert.addEventListener('click', (e) => {
            e.stopPropagation();          // doble seguro anti-Leaflet
            alertToast.style.opacity = '0';
            alertToast.style.transform = 'translateY(8px)';
            setTimeout(() => alertToast.classList.add('hidden'), 280);
        });
    }


    // =========================================
    // BOTÓN SOS
    // =========================================
    function triggerSOS() {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        alert('🚨 SOS activado. Contactando servicios de emergencia y enviando tu ubicación...');
        // TODO: integrar API de emergencia con coordenadas GPS reales
    }

    const btnSOS = document.getElementById('btn-sos');
    if (btnSOS)       btnSOS.addEventListener('click', triggerSOS);
    if (btnSOSGlobal) btnSOSGlobal.addEventListener('click', triggerSOS);


    // =========================================
    // FORMULARIO DE REPORTE
    // =========================================
    const formReporte    = document.getElementById('form-reporte');
    const photoArea      = document.getElementById('photo-upload-area');
    const inputFoto      = document.getElementById('input-foto');
    const btnGPS         = document.getElementById('btn-gps');
    const inputUbicacion = document.getElementById('input-ubicacion');

    if (photoArea && inputFoto) {
        photoArea.addEventListener('click', () => inputFoto.click());
        inputFoto.addEventListener('change', () => {
            if (inputFoto.files.length > 0) {
                photoArea.innerHTML = `<i class="fa-solid fa-check-circle fs-2 mb-2" style="color:#0D9488"></i>
                                       <span>${inputFoto.files[0].name}</span>`;
            }
        });
    }

    if (btnGPS && inputUbicacion) {
        btnGPS.addEventListener('click', () => {
            if (!navigator.geolocation) { alert('Tu navegador no soporta geolocalización.'); return; }
            btnGPS.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            navigator.geolocation.getCurrentPosition(
                pos => {
                    inputUbicacion.value = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                    btnGPS.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
                },
                () => {
                    alert('No se pudo obtener la ubicación.');
                    btnGPS.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
                }
            );
        });
    }

    if (formReporte) {
        formReporte.addEventListener('submit', e => {
            e.preventDefault();
            if (!formReporte.checkValidity()) { formReporte.classList.add('was-validated'); return; }
            alert('✅ Reporte enviado. ¡Gracias por ayudar a tu comunidad!');
            formReporte.reset();
            formReporte.classList.remove('was-validated');
            if (photoArea) photoArea.innerHTML = `<i class="fa-solid fa-camera fs-2 mb-2"></i><span>Toca para adjuntar una foto</span>`;
            showView('view-mapa');
        });
    }


    // =========================================
    // PERFIL — cerrar sesión
    // =========================================
    const menuCerrarSesion = document.getElementById('menu-cerrar-sesion');
    if (menuCerrarSesion) {
        menuCerrarSesion.addEventListener('click', e => {
            e.preventDefault();
            alert('Sesión cerrada.');
        });
    }

});
