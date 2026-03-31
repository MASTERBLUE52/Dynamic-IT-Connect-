const projects = [
  {
    title: "Textile Software",
    description:
      "Online accounting and textile process management system designed to simplify complex workflows.",
    image: "/images/portfolio/textile.jpg",
    link: "#",
  },
  {
    title: "Accounting with Inventory",
    description:
      "Complete accounting solution integrated with inventory management for accuracy and efficiency.",
    image: "/images/portfolio/accounting.jpg",
    link: "#",
  },
  {
    title: "Transport Management",
    description:
      "Transport software for managing invoices, challans, vouchers, and logistics operations.",
    image: "/images/portfolio/transport.jpg",
    link: "#",
  },
  {
    title: "Centring Management",
    description: "System designed to manage centring supply and operational processes efficiently.",
    image: "/images/portfolio/centring.jpg",
    link: "#",
  },
  {
    title: "CMS",
    description: "Customer Management System for handling client data, interactions, and business operations.",
    image: "/images/portfolio/cms.jpg",
    link: "#",
  },
  {
    title: "Payroll",
    description: "Payroll and employee management system ensuring accuracy, compliance, and automation.",
    image: "/images/portfolio/payroll.jpg",
    link: "#",
  },
  {
    title: "Training Management System",
    description: "Platform for managing student training programs, exams, and performance tracking.",
    image: "/images/portfolio/training.jpg",
    link: "#",
  },
  {
    title: "HRMS",
    description: "Human Resource Management System for handling employee records and organizational workflows.",
    image: "/images/portfolio/hrms.jpg",
    link: "#",
  },
];

const websites = [
  {
    title: "Al-Vard Collection",
    description: "A premium clothing store based in Surat offering timeless and elegant fashion collections.",
    image: "/images/portfolio/alvard.jpg",
    link: "https://www.alvardcollection.com/",
  },
  {
    title: "K. K. D. F.",
    description: "A martial arts organization focused on discipline, fitness, and personal growth.",
    image: "/images/portfolio/kkdf.jpg",
    link: "https://kkdfmartialarts.com/",
  },
  {
    title: "Pulak Sarees",
    description: "Leading supplier of sarees, salwar kameez, lehengas, and wedding collections.",
    image: "/images/portfolio/pulak.jpg",
    link: "https://www.pulaksarees.com/",
  },
  {
    title: "Aquanza",
    description: "Gateway to premium seafood, delivering high-quality products at the right price.",
    image: "/images/portfolio/aquanza.jpg",
    link: "http://www.aquanza.in/",
  },
];

function renderPortfolioCard(item, external) {
  const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `
    <a href="${item.link}"${attrs} class="portfolio-card">
      <div class="portfolio-image-wrap">
        <img src="${item.image}" alt="${item.title}" class="portfolio-image" loading="lazy" />
      </div>
      <div class="portfolio-body">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
      </div>
    </a>
  `;
}

function renderPortfolio() {
  const projectsGrid = document.getElementById("projects-grid");
  const websitesGrid = document.getElementById("websites-grid");
  if (projectsGrid) projectsGrid.innerHTML = projects.map((item) => renderPortfolioCard(item, false)).join("");
  if (websitesGrid) websitesGrid.innerHTML = websites.map((item) => renderPortfolioCard(item, true)).join("");
}

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

renderPortfolio();
setYear();
setupNav();
setupAuthUi();
