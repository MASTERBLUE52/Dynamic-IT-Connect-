function setYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

function setupNav() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

async function setupAuthUi() {
  const loginLink = document.getElementById("login-link");
  const authUser = document.getElementById("auth-user");
  const authAvatar = document.getElementById("auth-avatar");
  const authName = document.getElementById("auth-name");
  const logoutBtn = document.getElementById("logout-btn");
  if (!loginLink || !authUser || !authAvatar || !authName || !logoutBtn) return;

  function showLoggedOut() {
    loginLink.classList.remove("hidden");
    authUser.classList.add("hidden");
    authName.textContent = "";
    authAvatar.textContent = "";
  }

  function showLoggedIn(user) {
    const name = String(user?.name || "").trim() || "User";
    const words = name.split(/\s+/).filter(Boolean);
    const initials = words.slice(0, 2).map((w) => w[0]).join("") || "U";

    loginLink.classList.add("hidden");
    authUser.classList.remove("hidden");
    authName.textContent = name;
    authAvatar.textContent = initials;
  }

  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (res.ok && data.loggedIn && data.user) showLoggedIn(data.user);
    else showLoggedOut();
  } catch (error) {
    showLoggedOut();
  }

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      showLoggedOut();
      window.location.href = "/";
    } catch (error) {
      logoutBtn.disabled = false;
      logoutBtn.textContent = "Logout";
    }
  });
}

async function setupContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (!form || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Sending...";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      if (data.emailSent) {
        status.textContent = "Inquiry sent and email delivered.";
      } else {
        status.textContent = `Inquiry saved, but email not sent (${data.emailStatus}).`;
      }
      form.reset();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

setYear();
setupNav();
setupContactForm();
setupAuthUi();
