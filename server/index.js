require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool } = require("./db");
const {
  createOrUpdateRemito,
  listRemitos,
  getRemitoByOrder,
} = require("./remitos");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "aghlogintec2025";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function requireApiKey(req, res, next) {
  const key = req.header("X-API-Key") || req.header("x-api-key");
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "API Key inválida o no enviada" });
  }
  return next();
}

app.get("/", (_req, res) => {
  res.json({
    message: "API Logintec - Endpoints disponibles en /api",
    endpoints: {
      remitos: "/api/remitos",
      orders: "/api/orders",
    },
  });
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      db: "ok",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      db: err.message,
    });
  }
});

app.post("/api/remitos", requireApiKey, createOrUpdateRemito);
app.get("/api/remitos", requireApiKey, listRemitos);
app.get("/api/remitos/:order", requireApiKey, getRemitoByOrder);

// Alias para eTrac / front
app.post("/api/orders", requireApiKey, createOrUpdateRemito);
app.get("/api/orders", requireApiKey, listRemitos);
app.get("/api/orders/:order", requireApiKey, getRemitoByOrder);

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    message: "Esta API solo maneja rutas bajo /api",
    path: req.path,
  });
});

app.listen(PORT, () => {
  console.log(`Logintec Flash API en puerto ${PORT}`);
});
