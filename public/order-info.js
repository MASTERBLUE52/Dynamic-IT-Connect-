function formatInr(amount) {
  return `\u20B9${(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function renderOrderInfo(payment) {
  const content = document.getElementById("order-info-content");
  if (!content) return;

  if (!payment) {
    content.innerHTML = `
      <div class="order-info-note">
        Order information was not found.
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <section class="order-info-banner">
      <h2>Your order has been accepted</h2>
      <p>We will contact you within 24 hours. For more details or any query, please contact us.</p>
    </section>

    <section class="order-info-grid">
      <div class="order-info-row">
        <span class="order-info-label">Order ID</span>
        <span class="order-info-value">${payment.id || "N/A"}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Invoice Number</span>
        <span class="order-info-value">${payment.invoiceNumber || "N/A"}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Service</span>
        <span class="order-info-value">${payment.serviceTitle || "N/A"}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Subservice</span>
        <span class="order-info-value">${payment.subserviceTitle || "N/A"}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Amount Paid</span>
        <span class="order-info-value">${formatInr(payment.amount || 0)}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Status</span>
        <span class="order-info-value">${String(payment.status || "accepted").toUpperCase()}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Customer</span>
        <span class="order-info-value">${payment.customerName || "N/A"}</span>
      </div>
      <div class="order-info-row">
        <span class="order-info-label">Email</span>
        <span class="order-info-value">${payment.customerEmail || "N/A"}</span>
      </div>
    </section>

    <div class="order-info-note">
      Our team has accepted your order request and will contact you within 24 hours. For more details, use the Contact Us page.
    </div>
  `;
}

async function initOrderInfo() {
  let payment = null;
  try {
    payment = JSON.parse(sessionStorage.getItem("lastPayment") || "null");
  } catch (error) {
    payment = null;
  }

  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get("paymentId");
  if ((!payment || (paymentId && payment.id !== paymentId)) && paymentId) {
    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`);
      const data = await res.json();
      if (res.ok && data.payment) payment = data.payment;
    } catch (error) {
      payment = null;
    }
  }

  renderOrderInfo(payment);
}

initOrderInfo();
