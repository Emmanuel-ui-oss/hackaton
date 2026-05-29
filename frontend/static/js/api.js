const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function isAuth() {
    return !!getToken();
}

function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

async function apiRequest(endpoint, options = {}) {
    const headers = { ...options.headers };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    if (options.formData) {
        delete headers['Content-Type'];
        config.body = options.formData;
    } else if (options.body && !options.formData) {
        headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(options.body);
    }

    try {
        const resp = await fetch(`${API_BASE}${endpoint}`, config);
        if (resp.status === 204) return null;
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        if (!resp.ok) {
            const msg = typeof data === 'string' ? data
                : data.detail || (data.detail && data.detail[0] && data.detail[0].msg) || 'Error';
            throw new Error(msg);
        }
        return data;
    } catch (e) {
        if (e.name === 'TypeError' && e.message.includes('fetch')) {
            throw new Error('Error de conexión con el servidor');
        }
        throw e;
    }
}

function showToast(msg, duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), duration);
}
