// frontend/src/api.js
export function getToken() {
    return localStorage.getItem("alrosa_token") || "";
}

export function authHeaders(extra = {}) {
    return {
        ...extra,
        Authorization: `Bearer ${getToken()}`,
    };
}

export async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: authHeaders(options.headers),
    });

    if (res.status === 401) {
        // токен протух — выкидываем на логин
        localStorage.removeItem("alrosa_token");
        window.location.reload();
    }

    return res;
}