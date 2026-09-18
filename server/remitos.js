const { pool } = require("./db");
const { normalizeOrderPayload, toApiOrder } = require("./normalize");

const UPSERT_SQL = `
INSERT INTO logintec_flash (
  order_number, order2, rma, customer, order_date, eta,
  ship_company, ship_contact, ship_phone, ship_address, ship_city, ship_zip,
  status, status_type, items, etrac_order_id, event_type, raw_payload, updated_at
) VALUES (
  $1,$2,$3,$4,$5,$6,
  $7,$8,$9,$10,$11,$12,
  $13,$14,$15::jsonb,$16,$17,$18::jsonb, NOW()
)
ON CONFLICT (order_number) DO UPDATE SET
  order2 = EXCLUDED.order2,
  rma = COALESCE(EXCLUDED.rma, logintec_flash.rma),
  customer = COALESCE(EXCLUDED.customer, logintec_flash.customer),
  order_date = COALESCE(EXCLUDED.order_date, logintec_flash.order_date),
  eta = COALESCE(EXCLUDED.eta, logintec_flash.eta),
  ship_company = COALESCE(EXCLUDED.ship_company, logintec_flash.ship_company),
  ship_contact = COALESCE(EXCLUDED.ship_contact, logintec_flash.ship_contact),
  ship_phone = COALESCE(EXCLUDED.ship_phone, logintec_flash.ship_phone),
  ship_address = COALESCE(EXCLUDED.ship_address, logintec_flash.ship_address),
  ship_city = COALESCE(EXCLUDED.ship_city, logintec_flash.ship_city),
  ship_zip = COALESCE(EXCLUDED.ship_zip, logintec_flash.ship_zip),
  status = EXCLUDED.status,
  status_type = EXCLUDED.status_type,
  items = EXCLUDED.items,
  etrac_order_id = COALESCE(EXCLUDED.etrac_order_id, logintec_flash.etrac_order_id),
  event_type = EXCLUDED.event_type,
  raw_payload = EXCLUDED.raw_payload,
  updated_at = NOW()
RETURNING *;
`;

async function createOrUpdateRemito(req, res) {
  try {
    const normalized = normalizeOrderPayload(req.body);

    if (!normalized.items || normalized.items.length === 0) {
      return res.status(400).json({
        error: "Formato inválido",
        message: 'El campo "items" debe ser un array con al menos un elemento',
      });
    }

    const values = [
      normalized.order_number,
      normalized.order2,
      normalized.rma,
      normalized.customer,
      normalized.order_date,
      normalized.eta,
      normalized.ship_company,
      normalized.ship_contact,
      normalized.ship_phone,
      normalized.ship_address,
      normalized.ship_city,
      normalized.ship_zip,
      normalized.status,
      normalized.status_type,
      JSON.stringify(normalized.items),
      normalized.etrac_order_id,
      normalized.event_type,
      JSON.stringify(req.body),
    ];

    const result = await pool.query(UPSERT_SQL, values);
    const row = result.rows[0];

    return res.status(201).json({
      ok: true,
      message: "Orden recibida",
      order: toApiOrder(row),
    });
  } catch (err) {
    if (err.message && /items|reference1|order|ShipperOrderId|Body JSON/i.test(err.message)) {
      return res.status(400).json({
        error: "Formato inválido",
        message: err.message,
      });
    }
    console.error("POST /api/remitos:", err);
    return res.status(500).json({
      error: "Error del servidor",
      message: "Error interno del servidor",
      detail: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
}

async function listRemitos(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const q = (req.query.q || "").trim();

    let result;
    if (q) {
      result = await pool.query(
        `SELECT * FROM logintec_flash
         WHERE order_number ILIKE $1
            OR COALESCE(order2,'') ILIKE $1
            OR COALESCE(rma,'') ILIKE $1
            OR COALESCE(customer,'') ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [`%${q}%`, limit]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM logintec_flash ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
    }

    return res.json({
      count: result.rows.length,
      orders: result.rows.map(toApiOrder),
    });
  } catch (err) {
    console.error("GET /api/remitos:", err);
    return res.status(500).json({
      error: "Error del servidor",
      message: "Error interno del servidor",
      detail: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }
}

async function getRemitoByOrder(req, res) {
  try {
    const order = req.params.order;
    const result = await pool.query(
      `SELECT * FROM logintec_flash
       WHERE order_number = $1 OR order2 = $1 OR rma = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [order]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "No encontrado",
        message: `No hay orden con número "${order}"`,
      });
    }

    return res.json(toApiOrder(result.rows[0]));
  } catch (err) {
    console.error("GET /api/remitos/:order:", err);
    return res.status(500).json({
      error: "Error del servidor",
      message: "Error interno del servidor",
    });
  }
}

module.exports = {
  createOrUpdateRemito,
  listRemitos,
  getRemitoByOrder,
};
