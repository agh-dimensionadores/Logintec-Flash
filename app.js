const $ = (sel) => document.querySelector(sel);

const els = {
  input: $("#orderInput"),
  searchBtn: $("#searchBtn"),
  clearBtn: $("#clearBtn"),
  emptyState: $("#emptyState"),
  loadingState: $("#loadingState"),
  errorState: $("#errorState"),
  errorMessage: $("#errorMessage"),
  listSection: $("#listSection"),
  orderList: $("#orderList"),
  listCount: $("#listCount"),
  resultSection: $("#resultSection"),
  resultTitle: $("#resultTitle"),
  statusBadge: $("#statusBadge"),
  fieldOrder: $("#fieldOrder"),
  fieldOrder2: $("#fieldOrder2"),
  fieldRma: $("#fieldRma"),
  fieldCustomer: $("#fieldCustomer"),
  fieldOrderDate: $("#fieldOrderDate"),
  fieldEta: $("#fieldEta"),
  fieldShipCompany: $("#fieldShipCompany"),
  fieldShipContact: $("#fieldShipContact"),
  fieldShipPhone: $("#fieldShipPhone"),
  fieldShipAddress: $("#fieldShipAddress"),
  fieldShipCity: $("#fieldShipCity"),
  fieldShipZip: $("#fieldShipZip"),
  detailBody: $("#detailBody"),
  lineCount: $("#lineCount"),
};

let currentOrder = null;

function formatDate(iso) {
  if (!iso || iso === "—") return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hideAllViews() {
  els.emptyState.classList.add("hidden");
  els.loadingState.classList.add("hidden");
  els.errorState.classList.add("hidden");
  els.listSection.classList.add("hidden");
  els.resultSection.classList.add("hidden");
}

function setBadge(status, type) {
  els.statusBadge.textContent = status || "Recibido";
  els.statusBadge.className = "status-pill";
  if (type === "pending") els.statusBadge.classList.add("status-pill--pending");
  else if (type === "shipped") els.statusBadge.classList.add("status-pill--shipped");
  else if (type === "rma") els.statusBadge.classList.add("status-pill--rma");
  else els.statusBadge.classList.add("status-pill--pending");
}

function showError(message) {
  hideAllViews();
  els.errorState.classList.remove("hidden");
  els.errorMessage.textContent = message;
  currentOrder = null;
}

function setSearching(isLoading) {
  els.searchBtn.disabled = isLoading;
  els.input.disabled = isLoading;
  els.searchBtn.textContent = isLoading ? "Buscando…" : "Buscar";
}

function renderOrderList(orders) {
  hideAllViews();
  currentOrder = null;

  if (!orders.length) {
    els.emptyState.classList.remove("hidden");
    return;
  }

  els.listCount.textContent = `${orders.length} orden${orders.length !== 1 ? "es" : ""}`;
  els.orderList.innerHTML = orders
    .map((o) => {
      const ship = o.shipTo || {};
      const lines = Array.isArray(o.lines) ? o.lines.length : 0;
      return `
        <button type="button" class="order-list__row" data-order="${escapeHtml(o.order)}">
          <div class="order-list__main">
            <span class="order-list__id">#${escapeHtml(o.order)}</span>
            <span class="order-list__customer">${escapeHtml(o.customer || "—")}</span>
          </div>
          <div class="order-list__meta">
            <span>${escapeHtml(ship.company || "—")}</span>
            <span>ETA ${escapeHtml(formatDate(o.eta))}</span>
            <span>${lines} ítem${lines !== 1 ? "s" : ""}</span>
          </div>
        </button>`;
    })
    .join("");

  els.listSection.classList.remove("hidden");
}

function renderOrder(data) {
  hideAllViews();
  currentOrder = data;
  els.resultSection.classList.remove("hidden");

  els.resultTitle.textContent = `#${data.order}`;
  setBadge(data.status, data.statusType);

  els.fieldOrder.textContent = data.order || "—";
  els.fieldOrder2.textContent = data.order2 || "—";
  els.fieldRma.textContent = data.rma || "—";
  els.fieldCustomer.textContent = data.customer || "—";
  els.fieldOrderDate.textContent = formatDate(data.orderDate);
  els.fieldEta.textContent = formatDate(data.eta);

  const ship = data.shipTo || {};
  els.fieldShipCompany.textContent = ship.company || "—";
  els.fieldShipContact.textContent = ship.contact || "—";
  els.fieldShipPhone.textContent = ship.phone || "—";
  els.fieldShipAddress.textContent = ship.address || "—";
  els.fieldShipCity.textContent = ship.city || "—";
  els.fieldShipZip.textContent = ship.zip || "—";

  const lines = Array.isArray(data.lines) ? data.lines : [];
  els.detailBody.innerHTML = lines
    .map(
      (line) => `
      <div class="item-row">
        <span class="item-row__part">${escapeHtml(line.part)}</span>
        <span class="item-row__serial">${
          line.serial && line.serial !== "—"
            ? "S/N " + escapeHtml(line.serial)
            : "Sin serial"
        }</span>
        <span class="item-row__qty">×${escapeHtml(line.qty)}</span>
      </div>`
    )
    .join("");

  const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  els.lineCount.textContent = `${lines.length} ítem${lines.length !== 1 ? "s" : ""} · ${totalQty} uds.`;
}

async function loadAllOrders(filter = "") {
  hideAllViews();
  els.loadingState.classList.remove("hidden");
  setSearching(true);

  try {
    const { orders } = await fetchOrders(filter, 100);
    renderOrderList(orders);
  } catch (err) {
    showError(err.message || "No se pudieron cargar las órdenes.");
  } finally {
    setSearching(false);
  }
}

async function search() {
  const query = els.input.value.trim();
  if (!query) {
    await loadAllOrders();
    return;
  }

  setSearching(true);
  hideAllViews();
  els.loadingState.classList.remove("hidden");

  try {
    const order = await fetchOrder(query);
    renderOrder(order);
  } catch (err) {
    if (err.code === 404) {
      // Si no es match exacto, intentar listado filtrado
      try {
        const { orders } = await fetchOrders(query, 100);
        if (orders.length === 1) renderOrder(orders[0]);
        else if (orders.length > 1) renderOrderList(orders);
        else showError(err.message);
      } catch (_) {
        showError(err.message);
      }
    } else {
      showError(err.message || "No se pudo consultar la orden.");
    }
  } finally {
    setSearching(false);
  }
}

function clearSearch() {
  els.input.value = "";
  els.input.focus();
  loadAllOrders();
}

document.getElementById("printBtn").addEventListener("click", () => {
  const query = (currentOrder && currentOrder.order) || els.input.value.trim();
  if (query) {
    window.open(`remito-print.html?orden=${encodeURIComponent(query)}`, "_blank");
  }
});

els.orderList.addEventListener("click", (e) => {
  const row = e.target.closest("[data-order]");
  if (!row) return;
  els.input.value = row.dataset.order;
  search();
});

els.searchBtn.addEventListener("click", search);
els.clearBtn.addEventListener("click", clearSearch);

els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});

loadAllOrders();
