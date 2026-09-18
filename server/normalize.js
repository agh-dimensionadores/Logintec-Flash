/**
 * Normaliza payloads eTrac (ReadyForTender completo o formato simplificado)
 * a los campos del front Logintec-Flash.
 */

function refValue(pairs, key) {
  if (!Array.isArray(pairs)) return null;
  const hit = pairs.find((p) => p && p.key === key);
  return hit && hit.value != null ? String(hit.value) : null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function destinationStop(order) {
  const stops = order && Array.isArray(order.stops) ? order.stops : [];
  return (
    stops.find((s) => s.stopType === "Destination") ||
    stops.find((s) => s.locationType === "Commercial") ||
    stops[stops.length - 1] ||
    null
  );
}

function mapFullEtracItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const part =
      refValue(item.nonUniqueReferencePairs, "PARTNUMBER") ||
      refValue(item.uniqueReferencePairs, "PARTNUMBER") ||
      null;
    const bin =
      refValue(item.nonUniqueReferencePairs, "BINLOCATION") ||
      refValue(item.uniqueReferencePairs, "BINLOCATION") ||
      null;
    const serial =
      refValue(item.nonUniqueReferencePairs, "SERIAL") ||
      refValue(item.nonUniqueReferencePairs, "SERIALNUMBER") ||
      refValue(item.uniqueReferencePairs, "SERIAL") ||
      null;

    let partDescription = null;
    if (bin) partDescription = `Bin Number: ${bin};`;
    if (part && !partDescription) partDescription = part;

    return {
      part: part || "—",
      partDescription: partDescription || null,
      serial: serial || "—",
      qty: Number(item.count) > 0 ? Number(item.count) : 1,
    };
  });
}

function mapSimpleItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El campo "items" debe ser un array con al menos un elemento');
  }
  return items.map((item) => {
    const part =
      item.part ||
      item.partNumber ||
      (item.partDescription ? String(item.partDescription).replace(/^Bin Number:\s*/i, "").replace(/;.*$/, "").trim() : null) ||
      "—";
    return {
      part: String(part),
      partDescription: item.partDescription ? String(item.partDescription) : null,
      serial: item.serial != null && item.serial !== "" ? String(item.serial) : "—",
      qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
    };
  });
}

function fromSimplified(body) {
  const ship = body.shipTo || {};
  const orderNumber =
    body.reference1 ||
    body.order ||
    body.orderNumber ||
    body.order_number;

  if (!orderNumber) {
    throw new Error('Falta "reference1" u "order"');
  }

  return {
    order_number: String(orderNumber),
    order2: body.order2 || body.order_2 || null,
    rma: body.rma || null,
    customer: body.customer || null,
    order_date: parseDate(body.orderDate || body.order_date || body.created) || new Date().toISOString(),
    eta: parseDate(body.eta),
    ship_company: ship.name || ship.company || null,
    ship_contact: ship.contact || (ship.attentionTo && ship.attentionTo.name) || null,
    ship_phone: ship.phone || (ship.attentionTo && ship.attentionTo.phone) || null,
    ship_address: ship.address || ship.street1 || null,
    ship_city: ship.city || null,
    ship_zip: ship.zip || ship.postalCode || null,
    status: body.status || "Recibido",
    status_type: body.statusType || body.status_type || "pending",
    items: mapSimpleItems(body.items),
    etrac_order_id: body.etrac_order_id || null,
    event_type: body.eventType || "Simplified",
  };
}

function fromReadyForTender(body) {
  const order = body.order || {};
  const dest = destinationStop(order);
  const shipper = order.shipperPartner || {};

  const orderNumber =
    refValue(order.uniqueReferencePairs, "ShipperOrderId") ||
    order.id;

  if (!orderNumber) {
    throw new Error("No se encontró ShipperOrderId ni order.id en el payload eTrac");
  }

  const attention = (dest && dest.attentionTo) || {};
  const cityParts = [];
  if (dest) {
    if (dest.city) cityParts.push(dest.city);
    if (dest.state) cityParts.push(dest.state);
  }

  return {
    order_number: String(orderNumber),
    order2: refValue(order.uniqueReferencePairs, "Order2") || refValue(order.nonUniqueReferencePairs, "Order2") || null,
    rma: refValue(order.uniqueReferencePairs, "RMA") || refValue(order.nonUniqueReferencePairs, "RMA") || null,
    customer: shipper.name || shipper.userPartnersIdentifier || null,
    order_date: parseDate(order.created || body.readyForTenderDateTime || order.readyForTenderDateTime),
    eta: parseDate(
      (dest && (dest.earliestArrivalDateTime || dest.latestArrivalDateTime)) || null
    ),
    ship_company: dest ? dest.name || null : null,
    ship_contact: attention.name || null,
    ship_phone: attention.phone || null,
    ship_address: dest ? dest.street1 || null : null,
    ship_city: cityParts.length ? cityParts.join(", ") : null,
    ship_zip: dest ? dest.postalCode || null : null,
    status: "Recibido",
    status_type: "pending",
    items: mapFullEtracItems(order.items),
    etrac_order_id: order.id || null,
    event_type: body.eventType || "ReadyForTender",
  };
}

function normalizeOrderPayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Body JSON inválido");
  }

  if (body.order && (body.eventType === "ReadyForTender" || body.outputModel === "OrderModel")) {
    return fromReadyForTender(body);
  }

  if (body.order && body.order.stops && body.order.items) {
    return fromReadyForTender(body);
  }

  return fromSimplified(body);
}

function toApiOrder(row) {
  return {
    id: row.id,
    order: row.order_number,
    order2: row.order2 || "—",
    rma: row.rma || "—",
    customer: row.customer || "—",
    orderDate: row.order_date ? row.order_date.toISOString().slice(0, 10) : "—",
    eta: row.eta ? row.eta.toISOString().slice(0, 10) : "—",
    etaFull: row.eta ? row.eta.toISOString() : null,
    shipTo: {
      company: row.ship_company || "—",
      contact: row.ship_contact || "—",
      phone: row.ship_phone || "—",
      address: row.ship_address || "—",
      city: row.ship_city || "—",
      zip: row.ship_zip || "—",
    },
    status: row.status || "Recibido",
    statusType: row.status_type || "pending",
    lines: Array.isArray(row.items) ? row.items : [],
    etracOrderId: row.etrac_order_id,
    eventType: row.event_type,
    createdAt: row.created_at,
  };
}

module.exports = {
  normalizeOrderPayload,
  toApiOrder,
};
