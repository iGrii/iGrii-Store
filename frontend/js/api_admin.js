const API_URL = "http://localhost:3000";

function getToken() { return localStorage.getItem('token') || null; }
function authHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

// ===== GET PÚBLICOS =====
async function getCategorias() { const r = await fetch(`${API_URL}/categorias`); return r.json(); }
async function getProductos() { const r = await fetch(`${API_URL}/productos`); return r.json(); }
async function getImagenes(producto_id) { const r = await fetch(`${API_URL}/imagenes/${producto_id}`); return r.json(); }

// ===== CRUD PROTEGIDO =====
async function crearCategoria(nombre) {
  return fetch(`${API_URL}/categorias`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ nombre }) });
}
async function crearProducto(nombre, precio, categoria_id) {
  return fetch(`${API_URL}/productos`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ nombre, precio, categoria_id }) });
}
async function crearImagen(url, producto_id) {
  return fetch(`${API_URL}/imagenes`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ url, producto_id }) });
}
async function eliminarCategoria(id) {
  return fetch(`${API_URL}/categorias/${id}`, { method: "DELETE", headers: authHeaders() });
}
async function eliminarProducto(id) {
  return fetch(`${API_URL}/productos/${id}`, { method: "DELETE", headers: authHeaders() });
}
async function eliminarImagen(id) {
  return fetch(`${API_URL}/imagenes/${id}`, { method: "DELETE", headers: authHeaders() });
}

// ===== AUTH =====
async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email, password }) });
  return res.json();
}
async function register(nombre, email, password, role) {
  return fetch(`${API_URL}/auth/register`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ nombre, email, password, role }) });
}
async function verifyToken() {
  const token = getToken();
  if (!token) return { valid: false };
  try {
    const res = await fetch(`${API_URL}/auth/verify`, { headers: { "Authorization": `Bearer ${token}` } });
    return await res.json();
  } catch (e) {
    return { valid: false };
  }
}

