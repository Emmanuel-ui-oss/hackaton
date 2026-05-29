function navigate(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.toggle('active', a.dataset.view === viewName);
    });

    document.getElementById('navLinks').classList.remove('open');

    if (viewName === 'stats') {
        loadStats();
    }
    if (viewName === 'mapa') {
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-view]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(el.dataset.view);
        });
    });

    document.getElementById('navHamburger').addEventListener('click', () => {
        document.getElementById('navLinks').classList.toggle('open');
    });

    updateNav();
    navigate('mapa');
});
