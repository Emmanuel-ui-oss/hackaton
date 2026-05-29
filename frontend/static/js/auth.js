async function loginUser(username, password) {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { username, password },
    });
    setToken(data.access_token);
    const me = await apiRequest('/auth/me');
    setUser({ id: me.id, username: me.username, email: me.email });
    return me;
}

async function registerUser(username, email, password) {
    const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { username, email, password },
    });
    setToken(data.access_token);
    const me = await apiRequest('/auth/me');
    setUser({ id: me.id, username: me.username, email: me.email });
    return me;
}

function logoutUser() {
    removeToken();
    updateNav();
    navigate('mapa');
    showToast('Sesión cerrada');
}

function updateNav() {
    const userSpan = document.getElementById('navUser');
    const loginLink = document.getElementById('navLogin');
    const logoutLink = document.getElementById('navLogout');
    const reportLink = document.getElementById('navReport');

    if (isAuth()) {
        const u = getUser();
        userSpan.textContent = `👤 ${u ? u.username : ''}`;
        userSpan.style.display = 'inline';
        loginLink.style.display = 'none';
        logoutLink.style.display = 'inline-flex';
        reportLink.style.display = 'inline';
    } else {
        userSpan.style.display = 'none';
        loginLink.style.display = 'inline-flex';
        logoutLink.style.display = 'none';
        reportLink.style.display = 'none';
    }
}
