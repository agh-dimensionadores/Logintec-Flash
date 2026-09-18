require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("OK: tabla logintec_flash lista");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migración falló:", err.message);
  process.exit(1);
});
