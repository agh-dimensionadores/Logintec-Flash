require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el entorno");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("render.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

module.exports = { pool };
