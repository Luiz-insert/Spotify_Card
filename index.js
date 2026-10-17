// Login com Spotify usando Authorization Code + PKCE.
// Esse fluxo roda 100% no navegador e NÃO usa client_secret
// (o secret nunca deve ficar no front-end).
const CLIENT_ID = "b5e269953b144038af6f2eae30aa7235";
// Precisa estar cadastrado EXATAMENTE igual no Spotify Developer Dashboard
// (ex.: http://127.0.0.1:3000/ e https://seu-projeto.vercel.app/).
// Sempre a raiz do site, mesmo que a página tenha sido aberta como /index.html.
const REDIRECT_URI = window.location.origin + "/";
const SCOPES = "user-read-private user-read-email user-top-read";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1";
const USER_PROFILE = "/me";

// Períodos aceitos pela API em /me/top/tracks, do mais curto ao mais longo.
const TIME_RANGES = [
    { value: "short_term", label: "últimas ~4 semanas" },
    { value: "medium_term", label: "últimos ~6 meses" },
    { value: "long_term", label: "último ~1 ano" },
];
let rangeIndex = 1; // começa em ~6 meses
let topTracksCache = {};
let topTracksRequest = 0;

const topTracksPath = (range) => `/me/top/tracks?time_range=${range}&limit=10&offset=0`;

const DEFAULT_PHOTO = "placeholder.svg";

// ---------- Armazenamento do token ----------

const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch { /* sem storage: só vale nesta aba */ }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch { /* ignora */ }
    },
};

function saveTokens(data) {
    storage.set("access_token", data.access_token);
    storage.set("expires_at", String(Date.now() + data.expires_in * 1000));
    // O Spotify nem sempre devolve um refresh_token novo ao renovar.
    if (data.refresh_token) storage.set("refresh_token", data.refresh_token);
}

function clearTokens() {
    ["access_token", "expires_at", "refresh_token", "code_verifier", "auth_state"].forEach(storage.remove);
}

// ---------- PKCE ----------

function randomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, (v) => chars[v % chars.length]).join("");
}

async function codeChallenge(verifier) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

async function login() {
    const verifier = randomString(64);
    const state = randomString(16);
    storage.set("code_verifier", verifier);
    storage.set("auth_state", state);

    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: SCOPES,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: "S256",
        code_challenge: await codeChallenge(verifier),
        state,
    });
    window.location.href = `${AUTHORIZE_URL}?${params}`;
}

function logout() {
    clearTokens();
    resetCard();
    setLoggedIn(false);
    setStatus("");
}

async function requestToken(body) {
    const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || data.error || "Falha ao obter token");
    saveTokens(data);
    return data.access_token;
}

// Volta do Spotify com ?code=... (ou ?error=...) na URL.
async function handleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const state = params.get("state");
    if (!code && !error) return;

    // Limpa a URL para o código não ser reutilizado ao recarregar a página.
    window.history.replaceState({}, document.title, REDIRECT_URI);

    const expectedState = storage.get("auth_state");
    const verifier = storage.get("code_verifier");
    storage.remove("auth_state");
    storage.remove("code_verifier");

    if (error) throw new Error(error === "access_denied" ? "Login cancelado." : error);
    if (!state || state !== expectedState || !verifier) throw new Error("Resposta de login inválida. Tente novamente.");

    await requestToken({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
    });
}

async function refreshAccessToken() {
    const refreshToken = storage.get("refresh_token");
    if (!refreshToken) return null;
    try {
        return await requestToken({ grant_type: "refresh_token", refresh_token: refreshToken });
    } catch {
        clearTokens();
        return null;
    }
}

async function getAccessToken() {
    const token = storage.get("access_token");
    const expiresAt = Number(storage.get("expires_at"));
    // Renova um minuto antes de expirar.
    if (token && Date.now() < expiresAt - 60_000) return token;
    return refreshAccessToken();
}

// ---------- API ----------

async function spotifyApi(path) {
    let token = await getAccessToken();
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    let response = await fetch(API_URL + path, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
        token = await refreshAccessToken();
        if (!token) throw new Error("Sessão expirada. Faça login novamente.");
        response = await fetch(API_URL + path, { headers: { Authorization: `Bearer ${token}` } });
    }
    if (response.status === 403) {
        throw new Error("Acesso negado. Sua conta precisa estar liberada no app (Dashboard → User Management).");
    }
    if (response.status === 429) throw new Error("Muitas requisições. Aguarde um pouco e tente de novo.");
    if (!response.ok) throw new Error(`Erro ${response.status} ao acessar o Spotify.`);
    return response.json();
}

// ---------- Tela ----------

const els = {
    loginScreen: document.getElementById("loginScreen"),
    cardArea: document.getElementById("cardArea"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    status: document.getElementById("status"),
    loginStatus: document.getElementById("loginStatus"),
    photo: document.getElementById("imgPhoto"),
    displayName: document.getElementById("displayName"),
    email: document.getElementById("userEmail"),
    userid: document.getElementById("userid"),
    list: document.getElementById("divDataVerse"),
    codes: document.getElementById("codes"),
    qrCode: document.getElementById("qrCode"),
    spotifyCode: document.getElementById("spotifyCode"),
    rangeLabel: document.getElementById("rangeLabel"),
    rangePrev: document.getElementById("rangePrev"),
    rangeNext: document.getElementById("rangeNext"),
};

// A mensagem aparece tanto na tela inicial quanto no cartão (só um deles fica visível).
function setStatus(message, isError = false) {
    for (const el of [els.status, els.loginStatus]) {
        el.textContent = message;
        el.classList.toggle("error", isError);
    }
}

// Sem login: só a tela inicial. Com login: só o cartão.
function setLoggedIn(loggedIn) {
    els.loginScreen.hidden = loggedIn;
    els.cardArea.hidden = !loggedIn;
    if (!loggedIn && typeof flip === "function") flip(false);
}

function setPlaceholder(text) {
    const li = document.createElement("li");
    li.className = "InfoVerse empty";
    li.textContent = text;
    els.list.replaceChildren(li);
}

function resetCard() {
    els.photo.src = DEFAULT_PHOTO;
    els.displayName.textContent = "…";
    els.email.textContent = "";
    els.userid.textContent = "…";
    els.codes.hidden = true;
    topTracksCache = {};
    setPlaceholder("Carregando...");
}

// Desenha o QR code como SVG (escala sem perder nitidez).
function renderQrCode(container, text) {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const size = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
        }
    }
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg.append(path);
    container.replaceChildren(svg);
}

function displayCodes(user) {
    const profileUrl = user.external_urls?.spotify || `https://open.spotify.com/user/${user.id}`;
    const uri = user.uri || `spotify:user:${user.id}`;
    els.codes.href = profileUrl;
    // Imagem do Spotify Code gerada pelo próprio Spotify: fundo branco, barras pretas.
    els.spotifyCode.src = `https://scannables.scdn.co/uri/plain/svg/FFFFFF/black/640/${encodeURIComponent(uri)}`;
    if (typeof qrcode === "function") renderQrCode(els.qrCode, profileUrl);
    els.qrCode.hidden = typeof qrcode !== "function";
    els.codes.hidden = false;
}

function displayUser(user) {
    const name = user.display_name || user.id;
    els.displayName.textContent = name;
    els.userid.textContent = name;
    els.displayName.title = name;
    els.userid.title = name;
    els.email.textContent = user.email || "";
    els.email.title = user.email || "";
    els.photo.src = user.images?.[0]?.url || DEFAULT_PHOTO;
    displayCodes(user);
}

function displayTopTracks(tracks) {
    if (!tracks.items?.length) {
        setPlaceholder("Ainda não há dados suficientes de escuta.");
        return;
    }
    const items = tracks.items.map((track, index) => {
        const li = document.createElement("li");
        li.className = "InfoVerse";

        // Número da posição como texto real (contador CSS não sai na imagem compartilhada).
        const rank = document.createElement("span");
        rank.className = "rankVerse";
        rank.textContent = index + 1;

        // A menor imagem do álbum (geralmente 64x64) já basta para a miniatura.
        const cover = document.createElement("img");
        cover.className = "coverVerse";
        cover.alt = "";
        const images = track.album?.images || [];
        if (images.length) cover.src = images[images.length - 1].url;

        const music = document.createElement("span");
        music.className = "musicVerse";
        music.textContent = track.name;

        const artist = document.createElement("span");
        artist.className = "artistVerse";
        artist.textContent = track.artists.map((a) => a.name).join(", ");

        li.title = `${track.name} — ${artist.textContent}`;
        li.append(rank, cover, music, artist);
        return li;
    });
    els.list.replaceChildren(...items);
}

// Busca (ou pega do cache) o top 10 do período atual e mostra na lista.
async function loadTopTracks() {
    const range = TIME_RANGES[rangeIndex].value;
    // Ignora respostas que chegarem depois de o usuário já ter trocado de novo.
    const request = ++topTracksRequest;
    els.list.classList.add("loading");
    try {
        topTracksCache[range] ??= await spotifyApi(topTracksPath(range));
        if (request === topTracksRequest) displayTopTracks(topTracksCache[range]);
    } catch (err) {
        if (request === topTracksRequest) setPlaceholder(err.message);
    } finally {
        if (request === topTracksRequest) els.list.classList.remove("loading");
    }
}

function changeRange(step) {
    rangeIndex = (rangeIndex + step + TIME_RANGES.length) % TIME_RANGES.length;
    els.rangeLabel.textContent = TIME_RANGES[rangeIndex].label;
    if (!els.cardArea.hidden) loadTopTracks();
}

async function loadCard() {
    setStatus("Carregando...");
    const [user] = await Promise.all([spotifyApi(USER_PROFILE), loadTopTracks()]);
    displayUser(user);
    setStatus("");
}

async function init() {
    // Se o Spotify Code não carregar, o QR code continua sozinho.
    els.spotifyCode.addEventListener("error", () => { els.spotifyCode.hidden = true; });
    els.spotifyCode.addEventListener("load", () => { els.spotifyCode.hidden = false; });
    els.photo.addEventListener("error", () => {
        if (!els.photo.src.endsWith(DEFAULT_PHOTO)) els.photo.src = DEFAULT_PHOTO;
    });
    els.loginBtn.addEventListener("click", () => {
        login().catch((err) => setStatus(err.message, true));
    });
    els.logoutBtn.addEventListener("click", logout);
    els.rangePrev.addEventListener("click", () => changeRange(-1));
    els.rangeNext.addEventListener("click", () => changeRange(1));

    if (window.location.protocol === "file:") {
        setStatus("Abra pelo servidor local (npm start), não direto pelo arquivo.", true);
        els.loginBtn.disabled = true;
        return;
    }

    try {
        if (new URLSearchParams(window.location.search).has("code")) setStatus("Entrando...");
        await handleRedirect();
        if (!storage.get("refresh_token") && !storage.get("access_token")) {
            setStatus("");
            return;
        }
        setLoggedIn(true);
        await loadCard();
    } catch (err) {
        // Sem os dados do perfil não há cartão para mostrar: volta para a tela inicial com o erro.
        setLoggedIn(false);
        setStatus(err.message, true);
    }
}

init();
