function formatInr(amount) {
  return `\u20B9${(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function renderInvoice(payment) {
  const content = document.getElementById("invoice-content");
  if (!content) return;
  if (!payment) {
    content.innerHTML = `
      <div class="invoice-row">
        <span class="invoice-label">Status</span>
        <span class="invoice-value">Invoice not found.</span>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="invoice-row">
      <span class="invoice-label">Invoice Number</span>
      <span class="invoice-value">${payment.invoiceNumber || "N/A"}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Transaction ID</span>
      <span class="invoice-value">${payment.transactionId}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Service</span>
      <span class="invoice-value">${payment.serviceTitle}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Subservice</span>
      <span class="invoice-value">${payment.subserviceTitle}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Amount Paid</span>
      <span class="invoice-value">${formatInr(payment.amount || 0)}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Payment Method</span>
      <span class="invoice-value">${String(payment.paymentMethod || "").toUpperCase()}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Customer</span>
      <span class="invoice-value">${payment.customerName} (${payment.customerEmail})</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Description</span>
      <span class="invoice-value">${payment.specification || "N/A"}</span>
    </div>
    <div class="invoice-row">
      <span class="invoice-label">Paid At</span>
      <span class="invoice-value">${payment.paidAt || payment.createdAt || "N/A"}</span>
    </div>
  `;
}

function downloadInvoice(payment) {
  const lines = [
    "Dynamic IT Services - Payment Invoice",
    `Invoice Number: ${payment.invoiceNumber || "N/A"}`,
    `Transaction ID: ${payment.transactionId || "N/A"}`,
    `Service: ${payment.serviceTitle || "N/A"}`,
    `Subservice: ${payment.subserviceTitle || "N/A"}`,
    `Amount Paid: ${formatInr(payment.amount || 0)}`,
    `Payment Method: ${String(payment.paymentMethod || "").toUpperCase()}`,
    `Customer: ${payment.customerName || "N/A"}`,
    `Email: ${payment.customerEmail || "N/A"}`,
    `Phone: ${payment.customerPhone || "N/A"}`,
    `Description: ${payment.specification || "N/A"}`,
    `Paid At: ${payment.paidAt || payment.createdAt || "N/A"}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${payment.invoiceNumber || "invoice"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function initInvoice() {
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
      // Ignore and use fallback.
    }
  }

  renderInvoice(payment);

  const downloadBtn = document.getElementById("download-invoice");
  const printBtn = document.getElementById("print-invoice");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (!payment) return;
      downloadInvoice(payment);
    });
  }
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }
}

initInvoice();
