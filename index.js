// ==================== DEPENDENCIAS ====================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");

// ==================== CONFIGURACIÓN APP ====================
const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "missecretito_cámbialo_por_algo_seguro";

// ==================== CORS ====================
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://admirable-fudge-d69549.netlify.app", // tu frontend en Netlify
  "https://igrii-store.onrender.com"            // tu backend en Render
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(express.json());

// ==================== FILTRO DE IP ====================
app.use((req, res, next) => {
  let clientIP = req.headers["x-forwarded-for"] || req.ip || req.connection.remoteAddress;
  if (clientIP && clientIP.includes(",")) {
    clientIP = clientIP.split(",")[0].trim();
  }

  const allowedIPs = ["45.232.149.130", "45.232.149.146", "45.232.149.145"];
  if (allowedIPs.includes(clientIP)) {
    next();
  } else {
    res.status(403).json({ message: "Acceso denegado: IP no permitida" });
  }
});

// ==================== CONEXIÓN BASE DE DATOS ====================
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "tienda",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==================== SWAGGER ====================
const { swaggerUi, swaggerSpecs } = require("./swagger");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ==================== RUTAS ====================
const categoriasRoutes = require("./routes/categorias");
const productosRoutes = require("./routes/productos");
const imagenesRoutes = require("./routes/imagenes");
const usuariosRoutes = require("./routes/usuarios");

app.use("/categorias", categoriasRoutes);
app.use("/productos", productosRoutes);
app.use("/imagenes", imagenesRoutes);
app.use("/usuarios", usuariosRoutes);

// ==================== SERVIR FRONTEND ====================
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// ==================== AUTENTICACIÓN ====================
app.post("/auth/register", async (req, res) => {
  try {
    const { nombre, email, password, role } = req.body;
    if (!nombre || !email || !password)
      return res.status(400).json({ error: "Faltan datos" });

    const [existing] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: "Email ya registrado" });

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
    if (!email || !password)
      return res.status(400).json({ error: "Faltan credenciales" });

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📘 Swagger disponible en https://igrii-store.onrender.com/api-docs`);
});
