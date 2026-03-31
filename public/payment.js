function parsePrice(priceText) {
  const value = String(priceText || "").toLowerCase().replace(/,/g, "");
  const match = value.match(/(\d+(\.\d+)?)(k)?/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  return match[3] ? Math.round(amount * 1000) : Math.round(amount);
}

function formatInr(amount) {
  return `\u20B9${(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function getTotalAmount(baseAmount) {
  const amount = Number(baseAmount) || 0;
  return amount > 0 ? amount : 0;
}

function renderOrderSummary(order) {
  const summary = document.getElementById("order-summary");
  if (!summary) return;

  if (!order) {
    summary.innerHTML = `
      <div class="summary-row">
        <span class="summary-label">No pending order</span>
        <span class="summary-value">Please go back, choose service, and click Order Now.</span>
      </div>
    `;
    return;
  }

  const featuresHtml = Array.isArray(order.features) && order.features.length
    ? `<ul class="summary-list">${order.features.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "<span class=\"summary-value\">N/A</span>";

  summary.innerHTML = `
    <div class="summary-row">
      <span class="summary-label">Service</span>
      <span class="summary-value">${order.serviceTitle}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Subservice</span>
      <span class="summary-value">${order.subserviceTitle}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Your Description</span>
      <span class="summary-value">${order.specification || "No description added."}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Includes</span>
      ${featuresHtml}
    </div>
  `;
}

function setAmountUi(totalAmount) {
  const mrp = document.getElementById("mrp-amount");
  const total = document.getElementById("total-amount");
  const payBtn = document.getElementById("pay-btn");
  if (!mrp || !total || !payBtn) return;

  const value = formatInr(totalAmount);
  mrp.textContent = value;
  total.textContent = value;
  payBtn.textContent = `Pay ${value}`;
}

function setMethodFields(method) {
  const paymentMethod = document.getElementById("payment-method");
  const cardFields = document.getElementById("card-fields");
  const netbankingFields = document.getElementById("netbanking-fields");
  const upiFields = document.getElementById("upi-fields");
  if (!paymentMethod || !cardFields || !netbankingFields || !upiFields) return;

  paymentMethod.value = method;
  cardFields.style.display = method === "card" ? "grid" : "none";
  netbankingFields.style.display = method === "netbanking" ? "grid" : "none";
  upiFields.style.display = method === "upi" ? "grid" : "none";
}

function setupCardInputRules() {
  const cardNumber = document.getElementById("card-number");
  const cardExpiry = document.getElementById("card-expiry");
  const cardCvv = document.getElementById("card-cvv");

  if (cardNumber) {
    cardNumber.addEventListener("input", () => {
      cardNumber.value = cardNumber.value.replace(/\D/g, "").slice(0, 16);
    });
  }

  if (cardExpiry) {
    cardExpiry.addEventListener("input", () => {
      const digits = cardExpiry.value.replace(/\D/g, "").slice(0, 4);
      cardExpiry.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    });
  }

  if (cardCvv) {
    cardCvv.addEventListener("input", () => {
      cardCvv.value = cardCvv.value.replace(/\D/g, "").slice(0, 4);
    });
  }
}

function setupMethodTabs() {
  const methodItems = Array.from(document.querySelectorAll(".method-item"));
  if (methodItems.length === 0) return;

  methodItems.forEach((item) => {
    item.addEventListener("click", () => {
      methodItems.forEach((node) => node.classList.remove("is-active"));
      item.classList.add("is-active");
      setMethodFields(item.dataset.method || "card");
    });
  });
}

function validateMethodDetails(formData) {
  const method = String(formData.get("paymentMethod") || "");

  if (method === "card") {
    const number = String(formData.get("cardNumber") || "").replace(/\s+/g, "");
    const expiry = String(formData.get("cardExpiry") || "").trim();
    const cvv = String(formData.get("cardCvv") || "").trim();
    if (!/^\d{16}$/.test(number)) return { ok: false, error: "Enter valid 16-digit card number." };
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) return { ok: false, error: "Enter valid expiry in MM/YY." };
    if (!/^\d{3,4}$/.test(cvv)) return { ok: false, error: "Enter valid CVV." };
    return { ok: true, methodDetails: { cardLast4: number.slice(-4), cardExpiry: expiry } };
  }

  if (method === "netbanking") {
    const bankName = String(formData.get("bankName") || "").trim();
    const accountHolder = String(formData.get("accountHolder") || "").trim();
    if (!bankName) return { ok: false, error: "Select bank for net banking." };
    if (accountHolder.length < 2) return { ok: false, error: "Enter account holder name." };
    return { ok: true, methodDetails: { bankName, accountHolder } };
  }

  if (method === "upi") {
    const upiId = String(formData.get("upiId") || "").trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) return { ok: false, error: "Enter valid UPI ID." };
    return { ok: true, methodDetails: { upiId } };
  }

  return { ok: false, error: "Select a payment method." };
}

async function getPaymentConfig() {
  try {
    const res = await fetch("/api/payments/config");
    const data = await res.json();
    if (res.ok) return data;
  } catch (error) {}
  return { mode: "demo", razorpayEnabled: false };
}

function setGatewayNote(text) {
  const note = document.querySelector(".gateway-note");
  if (!note) return;
  note.textContent = text;
}

function setRealPaymentUi(isReal) {
  const methodList = document.querySelector(".method-list");
  const cardFields = document.getElementById("card-fields");
  const netbankingFields = document.getElementById("netbanking-fields");
  const upiFields = document.getElementById("upi-fields");
  const paymentMethod = document.getElementById("payment-method");

  if (isReal) {
    if (methodList) methodList.style.display = "none";
    if (cardFields) cardFields.style.display = "none";
    if (netbankingFields) netbankingFields.style.display = "none";
    if (upiFields) upiFields.style.display = "none";
    if (paymentMethod) paymentMethod.value = "razorpay";
    setGatewayNote("You will be redirected to Razorpay secure checkout for real payment.");
    return;
  }

  if (methodList) methodList.style.display = "";
  setGatewayNote("Note: This is a demo gateway for student project testing.");
}

async function loadRazorpaySdk() {
  if (window.Razorpay) return true;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return Boolean(window.Razorpay);
}

async function initiatePayment(payload) {
  const endpoints = ["/api/payments/checkout", "/api/payment/checkout", "/api/payments/demo-checkout", "/api/payment/demo-checkout"];
  let lastError = "Payment failed";

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) return data;
      lastError = data.error || lastError;
      if (res.status !== 404) break;
    } catch (error) {
      lastError = error.message || lastError;
    }
  }

  throw new Error(lastError);
}

async function verifyRazorpayPayment(payload) {
  const res = await fetch("/api/payments/razorpay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "payment verification failed");
  return data;
}

function openRazorpayCheckout({ keyId, order, payment, customerName, customerEmail, customerPhone, pendingOrder }) {
  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: order.amount,
      currency: order.currency || "INR",
      name: "Dynamic IT Services",
      description: `${pendingOrder?.serviceTitle || "Service"} - ${pendingOrder?.subserviceTitle || "Checkout"}`,
      order_id: order.id,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      notes: {
        paymentId: payment.id,
      },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment popup closed.")),
      },
      theme: {
        color: "#1b7f45",
      },
    };

    const rz = new window.Razorpay(options);
    rz.on("payment.failed", (resp) => {
      const reason = resp?.error?.description || "Payment failed";
      reject(new Error(reason));
    });
    rz.open();
  });
}

async function setupPaymentForm() {
  const form = document.getElementById("payment-form");
  const status = document.getElementById("payment-status");
  const payBtn = document.getElementById("pay-btn");
  if (!form || !status || !payBtn) return;

  let pendingOrder = null;
  try {
    pendingOrder = JSON.parse(sessionStorage.getItem("pendingPayment") || "null");
  } catch (error) {
    pendingOrder = null;
  }

  renderOrderSummary(pendingOrder);
  const totalAmount = getTotalAmount(parsePrice(pendingOrder?.priceText));
  setAmountUi(totalAmount);
  const config = await getPaymentConfig();
  const isRealGateway = config.mode === "razorpay";
  setRealPaymentUi(isRealGateway);
  if (!isRealGateway) setMethodFields("card");

  if (!pendingOrder) {
    payBtn.disabled = true;
    status.className = "payment-status error";
    status.textContent = "No pending service order found.";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "payment-status";
    status.textContent = isRealGateway ? "Opening secure payment gateway..." : "Initiating payment...";
    payBtn.disabled = true;

    const formData = new FormData(form);
    const customerName = String(formData.get("customerName") || "").trim();
    const customerEmail = String(formData.get("customerEmail") || "").trim();
    const customerPhone = String(formData.get("customerPhone") || "").trim();
    const paymentMethod = isRealGateway ? "razorpay" : String(formData.get("paymentMethod") || "").trim();

    if (!customerName || !customerEmail || !customerPhone) {
      status.className = "payment-status error";
      status.textContent = "Name, email, and phone are required.";
      payBtn.disabled = false;
      return;
    }

    const validation = isRealGateway ? { ok: true, methodDetails: {} } : validateMethodDetails(formData);
    if (!validation.ok) {
      status.className = "payment-status error";
      status.textContent = validation.error;
      payBtn.disabled = false;
      return;
    }

    try {
      const data = await initiatePayment({
        serviceId: pendingOrder.serviceId,
        serviceTitle: pendingOrder.serviceTitle,
        subserviceTitle: pendingOrder.subserviceTitle,
        specification: pendingOrder.specification,
        packageDescription: pendingOrder.packageDescription,
        features: pendingOrder.features || [],
        priceText: pendingOrder.priceText,
        amount: totalAmount,
        paymentMethod,
        methodDetails: validation.methodDetails,
        customerName,
        customerEmail,
        customerPhone,
      });

      if (data.mode === "razorpay") {
        const sdkLoaded = await loadRazorpaySdk();
        if (!sdkLoaded) throw new Error("Unable to load payment gateway SDK.");

        const checkoutResponse = await openRazorpayCheckout({
          keyId: data.keyId,
          order: data.order,
          payment: data.payment,
          customerName,
          customerEmail,
          customerPhone,
          pendingOrder,
        });

        const verified = await verifyRazorpayPayment({
          paymentId: data.payment.id,
          razorpay_order_id: checkoutResponse.razorpay_order_id,
          razorpay_payment_id: checkoutResponse.razorpay_payment_id,
          razorpay_signature: checkoutResponse.razorpay_signature,
        });

        sessionStorage.setItem("lastPayment", JSON.stringify(verified.payment));
        sessionStorage.removeItem("pendingPayment");
        window.location.href = `/invoice.html?paymentId=${encodeURIComponent(verified.payment.id)}`;
        return;
      }

      sessionStorage.setItem("lastPayment", JSON.stringify(data.payment));
      sessionStorage.removeItem("pendingPayment");
      window.location.href = `/invoice.html?paymentId=${encodeURIComponent(data.payment.id)}`;
    } catch (error) {
      status.className = "payment-status error";
      status.textContent = error.message;
      payBtn.disabled = false;
    }
  });
}

setupMethodTabs();
setupCardInputRules();
setupPaymentForm();
