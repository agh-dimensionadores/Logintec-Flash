-- Tabla de órdenes Flash / eTrac para Logintec-Flash
CREATE TABLE IF NOT EXISTS logintec_flash (
  id                BIGSERIAL PRIMARY KEY,
  order_number      TEXT NOT NULL,
  order2            TEXT,
  rma               TEXT,
  customer          TEXT,
  order_date        TIMESTAMPTZ,
  eta               TIMESTAMPTZ,
  ship_company      TEXT,
  ship_contact      TEXT,
  ship_phone        TEXT,
  ship_address      TEXT,
  ship_city         TEXT,
  ship_zip          TEXT,
  status            TEXT DEFAULT 'Recibido',
  status_type       TEXT DEFAULT 'pending',
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  etrac_order_id    TEXT,
  event_type        TEXT,
  raw_payload       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS logintec_flash_order_number_uidx
  ON logintec_flash (order_number);

CREATE INDEX IF NOT EXISTS logintec_flash_customer_idx
  ON logintec_flash (customer);

CREATE INDEX IF NOT EXISTS logintec_flash_eta_idx
  ON logintec_flash (eta);

CREATE INDEX IF NOT EXISTS logintec_flash_created_at_idx
  ON logintec_flash (created_at DESC);
