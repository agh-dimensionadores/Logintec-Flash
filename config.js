/** Config API Logintec Flash (producción Render) */
const API_BASE = "https://apilogintec-f9r0.onrender.com";
const API_KEY = "aghlogintec2025";

/** eTrac manda "Part Number: NTK850DC; Bin Number: EZEA001C;" en partDescription */
function descField(desc, label) {
  const m = new RegExp(label + ":\\s*([^;]+)", "i").exec(desc || "");
  return m ? m[1].trim() : null;
}

function splitItemFields(order) {
  if (!order || !Array.isArray(order.lines)) return order;
  const lines = order.lines.map((line) => {
    const partNumber = descField(line.partDescription, "Part Number");
    const location = descField(line.partDescription, "Bin Number");
    const rawPart = line.part && line.part !== location ? line.part : null;
    return { ...line, partNumber: partNumber || rawPart || "—" };
  });
  return { ...order, lines };
}

function prepareOrder(order) {
  return splitItemFields(splitShipTo(order));
}

async function fetchOrder(orderNumber) {
  const q = String(orderNumber || "").trim();
  if (!q) throw new Error("Ingresá un número de orden");

  const res = await fetch(`${API_BASE}/api/remitos/${encodeURIComponent(q)}`, {
    headers: { "X-API-Key": API_KEY },
  });

  if (res.status === 404) {
    const err = new Error(`No se encontró ninguna orden con el número "${q}".`);
    err.code = 404;
    throw err;
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.message || body.error || "";
    } catch (_) {}
    const err = new Error(
      detail || `Error al consultar la API (${res.status}). Probá de nuevo en unos segundos.`
    );
    err.code = res.status;
    throw err;
  }

  return prepareOrder(await res.json());
}

async function fetchOrders(query = "", limit = 100) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query && query.trim()) params.set("q", query.trim());

  const res = await fetch(`${API_BASE}/api/remitos?${params}`, {
    headers: { "X-API-Key": API_KEY },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.message || body.error || "";
    } catch (_) {}
    throw new Error(detail || `Error al listar órdenes (${res.status}).`);
  }

  const data = await res.json();
  return {
    count: data.count || 0,
    orders: Array.isArray(data.orders) ? data.orders.map(prepareOrder) : [],
  };
}
