const statusEl = document.getElementById("auth-status");
const nextParam = new URLSearchParams(window.location.search).get("next");

function getSafeRedirectTarget(rawValue) {
  const fallback = "/";
  if (!rawValue) return fallback;
  if (!rawValue.startsWith("/") || rawValue.startsWith("//")) return fallback;
  return rawValue;
}

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  if (type === "error") statusEl.style.color = "#b42318";
  else if (type === "success") statusEl.style.color = "#047857";
  else statusEl.style.color = "#1f2937";
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  const jumpButtons = document.querySelectorAll("[data-tab-jump]");

  function activateTab(tabName) {
    buttons.forEach((b) => {
      const isActive = b.dataset.tab === tabName;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", String(isActive));
    });
    panels.forEach((p) => {
      p.classList.toggle("active", p.dataset.panel === tabName);
    });
    setStatus("");
  }

  buttons.forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
  jumpButtons.forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tabJump)));
}

async function apiPost(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setupForms() {
  const postAuthRedirect = getSafeRedirectTarget(nextParam);
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const forgotForm = document.getElementById("forgot-form");
  const sendOtpBtn = document.getElementById("send-otp-btn");
  const verifyOtpBtn = document.getElementById("verify-otp-btn");
  const newPassBlock = document.getElementById("new-pass-block");
  const forgotEmailInput = forgotForm.querySelector('input[name="email"]');
  const forgotOtpInput = forgotForm.querySelector('input[name="otp"]');
  const forgotNewPassInput = forgotForm.querySelector('input[name="newPassword"]');
  const forgotConfirmNewPassInput = forgotForm.querySelector('input[name="confirmNewPassword"]');
  let otpVerified = false;
  const loginPassword = loginForm.querySelector('input[name="password"]');
  const loginShowPass = document.getElementById("login-show-pass");
  const registerPassword = document.getElementById("register-password");
  const registerConfirmPassword = document.getElementById("register-confirm-password");
  const suggestedPassBtn = document.getElementById("suggested-pass-btn");
  const matchStatus = document.getElementById("match-status");

  function generateStrongPassword() {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const nums = "23456789";
    const specials = "@#$%&*!?";
    const all = upper + lower + nums + specials;

    let out = "";
    out += upper[Math.floor(Math.random() * upper.length)];
    out += lower[Math.floor(Math.random() * lower.length)];
    out += nums[Math.floor(Math.random() * nums.length)];
    out += specials[Math.floor(Math.random() * specials.length)];
    for (let i = 0; i < 8; i += 1) out += all[Math.floor(Math.random() * all.length)];
    return out.split("").sort(() => Math.random() - 0.5).join("");
  }

  function setSuggestedPassword() {
    const suggested = generateStrongPassword();
    suggestedPassBtn.textContent = suggested;
  }

  function updatePasswordMatch() {
    if (!registerConfirmPassword.value) {
      matchStatus.textContent = "";
      return true;
    }
    if (registerPassword.value === registerConfirmPassword.value) {
      matchStatus.textContent = "Passwords match";
      matchStatus.style.color = "#047857";
      return true;
    }
    matchStatus.textContent = "Password not matching";
    matchStatus.style.color = "#b42318";
    return false;
  }

  setSuggestedPassword();
  suggestedPassBtn.addEventListener("click", () => {
    const value = suggestedPassBtn.textContent;
    registerPassword.value = value;
    registerConfirmPassword.value = value;
    updatePasswordMatch();
  });

  registerPassword.addEventListener("input", updatePasswordMatch);
  registerConfirmPassword.addEventListener("input", updatePasswordMatch);
  loginShowPass.addEventListener("change", () => {
    loginPassword.type = loginShowPass.checked ? "text" : "password";
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Logging in...");
    try {
      const payload = formDataObject(loginForm);
      const data = await apiPost("/api/auth/login", payload);
      setStatus(`Welcome back, ${data.user.name}. Login successful.`, "success");
      setTimeout(() => (window.location.href = postAuthRedirect), 700);
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!updatePasswordMatch()) {
      setStatus("Password not matching", "error");
      return;
    }
    setStatus("Creating account...");
    try {
      const payload = formDataObject(registerForm);
      delete payload.confirmPassword;
      const data = await apiPost("/api/auth/register", payload);
      const message = data.registrationEmailSent
        ? `Account created for ${data.user.name}. Check your email for the welcome message.`
        : `Account created for ${data.user.name}.`;
      setStatus(message, "success");
      setTimeout(() => (window.location.href = postAuthRedirect), 900);
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      setStatus("Verify OTP first.", "error");
      return;
    }
    if (!forgotNewPassInput.value || !forgotConfirmNewPassInput.value) {
      setStatus("Enter new password in both fields.", "error");
      return;
    }
    if (forgotNewPassInput.value !== forgotConfirmNewPassInput.value) {
      setStatus("Password not matching", "error");
      return;
    }

    setStatus("Creating new password...");
    try {
      const payload = {
        email: forgotEmailInput.value.trim(),
        otp: forgotOtpInput.value.trim(),
        newPassword: forgotNewPassInput.value,
      };
      await apiPost("/api/auth/forgot/confirm", payload);
      setStatus("Password reset successful. Please login now.", "success");
      otpVerified = false;
      newPassBlock.classList.add("hidden");
      forgotForm.reset();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  sendOtpBtn.addEventListener("click", async () => {
    const email = forgotEmailInput.value.trim();
    if (!email) {
      setStatus("Enter your registered email first.", "error");
      return;
    }
    setStatus("Sending OTP to your registered email...");
    try {
      const data = await apiPost("/api/auth/forgot/request", { email });
      if (data.demoOtp) {
        forgotOtpInput.value = data.demoOtp;
        setStatus(`Demo mode: use OTP ${data.demoOtp}`, "success");
      } else {
        setStatus("OTP sent. Check your inbox and then reset password.", "success");
      }
      otpVerified = false;
      newPassBlock.classList.add("hidden");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  verifyOtpBtn.addEventListener("click", async () => {
    const email = forgotEmailInput.value.trim();
    const otp = forgotOtpInput.value.trim();
    if (!email) return setStatus("Enter your registered email first.", "error");
    if (!otp) return setStatus("Enter OTP first.", "error");

    setStatus("Verifying OTP...");
    try {
      await apiPost("/api/auth/forgot/verify", { email, otp });
      otpVerified = true;
      newPassBlock.classList.remove("hidden");
      forgotNewPassInput.required = true;
      forgotConfirmNewPassInput.required = true;
      setStatus("OTP verified. Now create your new password.", "success");
    } catch (error) {
      otpVerified = false;
      newPassBlock.classList.add("hidden");
      setStatus(error.message === "otp not valid" ? "otp not valid" : error.message, "error");
    }
  });
}

setupTabs();
setupForms();
