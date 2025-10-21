// index.js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path"); // <== IMPORTANTE para servir tu frontend

const app = express();

// ====== CONFIGURACIÓN CORS ======
app.use(cors({
  origin: [
    "http://localhost:5500", 
    "http://127.0.0.1:5500",
    "https://igrii-store.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// ----- CONFIGURACIÓN BASE DE DATOS -----
const PORT = process.env.PORT || 3000;
const JWT_SECRET = "missecretito_cámbialo_por_algo_seguro"; // cambia en producción

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // <- pon tu contraseña si tienes
  database: "tienda",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ----------------- Middleware de verificación -----------------
function verifyTokenMiddleware(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) return res.status(401).json({ error: "No token provided" });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ error: "Token malformado" });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // id, email, role
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// Middleware que exige rol admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Se requiere rol admin" });
  }
  next();
}

// =================== RUTAS PÚBLICAS ===================
app.get("/categorias", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categorias");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

app.get("/productos", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.nombre, p.precio, p.categoria_id, c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

app.get("/imagenes/:producto_id", async (req, res) => {
  try {
    const { producto_id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM imagenes_productos WHERE producto_id = ?",
      [producto_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener imágenes" });
  }
});

// =================== RUTAS PROTEGIDAS ===================
app.post("/categorias", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { nombre } = req.body;
    const [result] = await pool.query("INSERT INTO categorias (nombre) VALUES (?)", [nombre]);
    res.json({ id: result.insertId, nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear categoría" });
  }
});

app.delete("/categorias/:id", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM categorias WHERE id = ?", [id]);
    res.json({ message: "Categoría eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar categoría" });
  }
});

app.post("/productos", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { nombre, precio, categoria_id } = req.body;
    const [result] = await pool.query(
      "INSERT INTO productos (nombre, precio, categoria_id) VALUES (?, ?, ?)",
      [nombre, precio, categoria_id || null]
    );
    res.json({ id: result.insertId, nombre, precio, categoria_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

app.delete("/productos/:id", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM productos WHERE id = ?", [id]);
    res.json({ message: "Producto eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

app.post("/imagenes", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { url, producto_id } = req.body;
    const [result] = await pool.query(
      "INSERT INTO imagenes_productos (url, producto_id) VALUES (?, ?)",
      [url, producto_id]
    );
    res.json({ id: result.insertId, url, producto_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear imagen" });
  }
});

app.delete("/imagenes/:id", verifyTokenMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM imagenes_productos WHERE id = ?", [id]);
    res.json({ message: "Imagen eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar imagen" });
  }
});

// =================== AUTENTICACIÓN ===================
app.post("/auth/register", async (req, res) => {
  try {
    const { nombre, email, password, role } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: "Faltan datos" });

    const [existing] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existing.length > 0) return res.status(400).json({ error: "Email ya registrado" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, role) VALUES (?, ?, ?, ?)",
      [nombre, email, hash, role || "cliente"]
    );
    res.json({ id: result.insertId, nombre, email, role: role || "cliente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Faltan credenciales" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

app.get("/auth/verify", (req, res) => {
  const auth = req.headers["authorization"];
  if (!auth) return res.json({ valid: false });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.json({ valid: false });

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.json({ valid: false });
  }
});

// =================== SERVIR FRONTEND ===================
// Asegúrate de tener una carpeta llamada "frontend" con tu index.html
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// =================== INICIAR SERVIDOR ===================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
