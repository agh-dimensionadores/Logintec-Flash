/**
 * Separa la dirección de una sola línea que manda eTrac, por ejemplo:
 *   "LOGINTEC SRL, Rodriguez Peña 3375, Partido de San Martin San Martin, Buenos, San Martin, Bu, B1650IQQ"
 * El orden esperado desde el final es: código postal, provincia, ciudad.
 * Se corta solo por ", " (coma + espacio) para no romper cosas como "km 37,5".
 */

const STATE_NAMES = {
  bu: "Buenos Aires",
  ba: "Buenos Aires",
  buenos: "Buenos Aires",
  "buenos aires": "Buenos Aires",
  "bs as": "Buenos Aires",
  "bs. as.": "Buenos Aires",
  caba: "CABA",
  cf: "CABA",
  "capital federal": "CABA",
};

const ZIP_RE = /^([A-Z]\d{4}[A-Z]{3}|[A-Z]?\d{4,5}(-\d{4})?)$/i;

function isEmptyField(value) {
  return !value || value === "—";
}

function isStateToken(token) {
  return Boolean(STATE_NAMES[token.toLowerCase()]) || /^[a-z]{2,3}$/i.test(token);
}

function parseAddressLine(raw) {
  const empty = { address: raw || null, city: null, zip: null, leading: null };
  if (!raw || typeof raw !== "string") return empty;

  const tokens = raw.split(/,\s+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 3) return empty;

  let zip = null;
  if (ZIP_RE.test(tokens[tokens.length - 1])) zip = tokens.pop();

  let state = null;
  if (tokens.length > 1 && isStateToken(tokens[tokens.length - 1])) {
    const t = tokens.pop();
    state = STATE_NAMES[t.toLowerCase()] || t;
  }

  let city = null;
  if (tokens.length > 1) city = tokens.pop();

  const cityLower = city ? city.toLowerCase() : null;
  const rest = tokens.filter((t) => {
    const lower = t.toLowerCase();
    if (STATE_NAMES[lower]) return false;
    if (state && lower === state.toLowerCase()) return false;
    return true;
  });

  let streetIdx = rest.findIndex((t) => /\d/.test(t));
  if (streetIdx === -1) streetIdx = 0;

  const leading = rest.slice(0, streetIdx);
  const street = rest
    .slice(streetIdx)
    .filter((t, i) => i === 0 || !cityLower || !t.toLowerCase().includes(cityLower));

  return {
    address: street.join(", ") || raw,
    city: [city, state].filter(Boolean).join(", ") || null,
    zip,
    leading: leading.join(", ") || null,
  };
}

function splitShipTo(order) {
  const ship = order && order.shipTo;
  if (!ship || isEmptyField(ship.address)) return order;
  if (!isEmptyField(ship.city) || !isEmptyField(ship.zip)) return order;

  const parsed = parseAddressLine(ship.address);
  const next = {
    ...ship,
    address: parsed.address || ship.address,
    city: parsed.city || ship.city,
    zip: parsed.zip || ship.zip,
  };

  if (parsed.leading) {
    if (isEmptyField(ship.company)) next.company = parsed.leading;
    else if (isEmptyField(ship.contact) && parsed.leading !== ship.company) next.contact = parsed.leading;
  }

  return { ...order, shipTo: next };
}
