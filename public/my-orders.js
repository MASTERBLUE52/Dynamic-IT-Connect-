function formatInr(amount) {
  return `\u20B9${(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function getAmountText(order) {
  if (order.priceText) return order.priceText;
  if (order.amount !== undefined && order.amount !== null && order.amount !== "") return formatInr(order.amount);
  return "On request";
}

function getServiceText(order) {
  const parts = [order.serviceTitle, order.subserviceTitle].filter(Boolean);
  if (parts.length > 0) return parts.join(" - ");
  if (order.projectSummary) return order.projectSummary;
  return "N/A";
}

function getStatusText(order) {
  if (order.status) return order.status;
  return "requested";
}

function renderOrders(orders) {
  const host = document.getElementById("orders-list");
  const note = document.getElementById("orders-note");
  if (!host || !note) return;

  if (!Array.isArray(orders) || orders.length === 0) {
    note.textContent = "No orders found.";
    host.innerHTML = "";
    return;
  }

  note.textContent = `Found ${orders.length} order(s).`;
  host.innerHTML = `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Order ID</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Service</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Amount</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Status</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Date</th>
            <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map(
              (order) => `
            <tr>
              <td style="border-bottom:1px solid #f0f0f0; padding:8px;">${order.id || "N/A"}</td>
              <td style="border-bottom:1px solid #f0f0f0; padding:8px;">${getServiceText(order)}</td>
              <td style="border-bottom:1px solid #f0f0f0; padding:8px;">${getAmountText(order)}</td>
              <td style="border-bottom:1px solid #f0f0f0; padding:8px;">${getStatusText(order)}</td>
              <td style="border-bottom:1px solid #f0f0f0; padding:8px;">${order.createdAt || "N/A"}</td>
              <td style="border-bottom:1px solid #f0f0f0; padding:8px;">
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                  ${
                    order.amount !== undefined && order.amount !== null
                      ? `<a href="/invoice.html?paymentId=${encodeURIComponent(order.id || "")}">View Invoice</a>
                  <a href="/order-info.html?paymentId=${encodeURIComponent(order.id || "")}">Order Info</a>`
                      : `<span style="color:#6b7280;">Order recorded</span>`
                  }
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function initOrders() {
  const note = document.getElementById("orders-note");
  try {
    const res = await fetch("/api/client/orders");
    const data = await res.json();
    if (res.status === 401) {
      window.location.href = "/login.html?next=/my-orders.html";
      return;
    }
    if (!res.ok) throw new Error(data.error || "Unable to fetch orders");
    renderOrders(data.orders || []);
  } catch (error) {
    if (note) note.textContent = error.message || "Unable to load orders.";
  }
}

initOrders();
