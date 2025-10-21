const API_URL = "http://localhost:3000";

async function getCategorias() {
  const res = await fetch(`${API_URL}/categorias`);
  return res.json();
}

async function getProductos() {
  const res = await fetch(`${API_URL}/productos`);
  return res.json();
}

async function getImagenes(producto_id) {
  const res = await fetch(`${API_URL}/imagenes/${producto_id}`);
  return res.json();
}


