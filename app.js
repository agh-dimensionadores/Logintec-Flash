const $ = (sel) => document.querySelector(sel);

const els = {
  input: $("#orderInput"),
  searchBtn: $("#searchBtn"),
  clearBtn: $("#clearBtn"),
  emptyState: $("#emptyState"),
  errorState: $("#errorState"),
  errorMessage: $("#errorMessage"),
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

function formatDate(iso) {
  if (!iso || iso === "—") return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function findOrder(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  return MOCK_ORDERS.find(
    (o) =>
      o.order.toLowerCase() === q ||
      o.order2.toLowerCase() === q ||
      o.rma.toLowerCase() === q
  );
}

function setBadge(status, type) {
  els.statusBadge.textContent = status;
  els.statusBadge.className = "status-pill";
  if (type === "pending") els.statusBadge.classList.add("status-pill--pending");
  else if (type === "shipped") els.statusBadge.classList.add("status-pill--shipped");
  else if (type === "rma") els.statusBadge.classList.add("status-pill--rma");
}

function showEmpty() {
  els.emptyState.classList.remove("hidden");
  els.errorState.classList.add("hidden");
  els.resultSection.classList.add("hidden");
}

function showError(message) {
  els.emptyState.classList.add("hidden");
  els.errorState.classList.remove("hidden");
  els.resultSection.classList.add("hidden");
  els.errorMessage.textContent = message;
}

function renderOrder(data) {
  els.emptyState.classList.add("hidden");
  els.errorState.classList.add("hidden");
  els.resultSection.classList.remove("hidden");

  els.resultTitle.textContent = `#${data.order}`;
  setBadge(data.status, data.statusType);

  els.fieldOrder.textContent = data.order;
  els.fieldOrder2.textContent = data.order2;
  els.fieldRma.textContent = data.rma;
  els.fieldCustomer.textContent = data.customer;
  els.fieldOrderDate.textContent = formatDate(data.orderDate);
  els.fieldEta.textContent = formatDate(data.eta);

  const ship = data.shipTo || {};
  els.fieldShipCompany.textContent = ship.company || "—";
  els.fieldShipContact.textContent = ship.contact || "—";
  els.fieldShipPhone.textContent = ship.phone || "—";
  els.fieldShipAddress.textContent = ship.address || "—";
  els.fieldShipCity.textContent = ship.city || "—";
  els.fieldShipZip.textContent = ship.zip || "—";

  els.detailBody.innerHTML = data.lines
    .map(
      (line) => `
      <div class="item-row">
        <span class="item-row__part">${line.part}</span>
        <span class="item-row__serial">${line.serial !== "—" ? "S/N " + line.serial : "Sin serial"}</span>
        <span class="item-row__qty">×${line.qty}</span>
      </div>`
    )
    .join("");

  const totalQty = data.lines.reduce((sum, l) => sum + l.qty, 0);
  els.lineCount.textContent = `${data.lines.length} ítem${data.lines.length !== 1 ? "s" : ""} · ${totalQty} uds.`;
}

function search() {
  const query = els.input.value;
  if (!query.trim()) {
    showEmpty();
    return;
  }

  const order = findOrder(query);
  if (!order) {
    showError(`No se encontró ninguna orden con el número "${query.trim()}".`);
    return;
  }

  renderOrder(order);
}

function clearSearch() {
  els.input.value = "";
  els.input.focus();
  showEmpty();
}

document.getElementById("printBtn").addEventListener("click", () => {
  const query = els.input.value.trim();
  if (query) window.open(`remito-print.html?orden=${encodeURIComponent(query)}`, "_blank");
});

els.searchBtn.addEventListener("click", search);
els.clearBtn.addEventListener("click", clearSearch);

els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") search();
});

document.querySelectorAll(".chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    els.input.value = btn.dataset.order;
    search();
  });
});

showEmpty();
