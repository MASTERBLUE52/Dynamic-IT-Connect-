function setYear() {
  document.getElementById("year").textContent = String(new Date().getFullYear());
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
  const authNote = document.getElementById("auth-note");
  if (!loginLink || !authUser || !authAvatar || !authName || !logoutBtn || !authNote) return { loggedIn: false };

  function showLoggedOut() {
    loginLink.classList.remove("hidden");
    authUser.classList.add("hidden");
    authName.textContent = "";
    authAvatar.textContent = "";
    authNote.className = "auth-note";
    authNote.textContent = "Login to manage future service requests.";
  }

  function showLoggedIn(user) {
    const name = String(user?.name || "").trim() || "User";
    const words = name.split(/\s+/).filter(Boolean);
    const initials = words.slice(0, 2).map((w) => w[0]).join("") || "U";

    loginLink.classList.add("hidden");
    authUser.classList.remove("hidden");
    authName.textContent = name;
    authAvatar.textContent = initials;
    authNote.className = "auth-note";
    authNote.textContent = `Logged in as ${name}.`;
  }

  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (res.ok && data.loggedIn && data.user) {
      showLoggedIn(data.user);
      logoutBtn.addEventListener("click", async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Logging out...";
        await fetch("/api/auth/logout", { method: "POST" });
        showLoggedOut();
        window.location.href = "/service-order.html";
      });
      return { loggedIn: true };
    }
  } catch (error) {
    // Ignore and show logged out state.
  }

  showLoggedOut();
  return { loggedIn: false };
}

const SERVICES = [
  {
    id: "secure-web-development",
    title: "Secure Web Development",
    description:
      "We deliver custom, secure, and scalable web development solutions tailored to your business goals. Our experienced designers, developers, and analysts work together to create fast, reliable, and secure websites that strengthen your online presence while maintaining high performance and data protection standards.",
  },
  {
    id: "logo-designing",
    title: "Logo Designing",
    description:
      "A strong brand starts with a memorable identity. Our logo design services focus on creating visually appealing and meaningful designs that reflect your brand values. We ensure every logo is unique, professional, and impactful, helping your business stand out in a competitive market.",
  },
  {
    id: "internet-marketing-seo",
    title: "Internet Marketing and SEO",
    description:
      "Online success begins with visibility. Our Internet Marketing and SEO services are designed to increase your website's reach, attract high-quality traffic, and improve search engine rankings. By combining proven SEO strategies with modern digital marketing techniques, we help businesses gain consistent visibility and long-term growth.",
  },
  {
    id: "digital-growth-solutions",
    title: "Digital Growth Solutions",
    description:
      "We go beyond development by offering complete digital growth solutions. From strategy planning to execution, we help businesses improve engagement, increase conversions, and build trust with their audience using data-driven and creative approaches.",
  },
  {
    id: "management-maintainance",
    title: "Management and Maintainance",
    description:
      "Comprehensive IT management and proactive maintenance designed to keep your infrastructure seamless, secure, and always-on. We handle the technology so you can focus on your business.",
  },
];

const SERVICE_SLIDER_IMAGES = {
  "secure-web-development": [
    "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
  ],
  "logo-designing": ["/images/logo-designing.png"],
  "internet-marketing-seo": ["/images/internet-marketing-seo.png"],
  "digital-growth-solutions": ["/images/digital-growth-marketing.png"],
  "management-maintainance": ["/images/maintenance-management.png"],
};

function setupServiceExplorer(authState = { loggedIn: false }) {
  const list = document.getElementById("service-list");
  const title = document.getElementById("service-title");
  const description = document.getElementById("service-description");
  const modules = document.getElementById("service-modules");
  if (!list || !title || !description || !modules) return;
  const topSlider = document.getElementById("service-top-slider");
  const params = new URLSearchParams(window.location.search);
  const requestedServiceId = params.get("service");
  let topSliderIntervalId = null;
  let currentService = null;

  modules.addEventListener("click", (event) => {
    const orderBtn = event.target.closest(".order-btn");
    if (!orderBtn) return;
    event.preventDefault();

    if (!authState.loggedIn) {
      alert("Plz log in to continue.");
      const nextPath = `${window.location.pathname}${window.location.search || ""}`;
      window.location.href = `/login.html?next=${encodeURIComponent(nextPath)}`;
      return;
    }

    if (!currentService) return;
    const card = orderBtn.closest(".module-card, .plan-card");
    if (!card) return;

    const subserviceTitle = card.querySelector("h3")?.textContent?.trim() || currentService.title;
    const priceText =
      card.querySelector(".price-chip")?.textContent?.trim() ||
      card.querySelector(".plan-price")?.textContent?.trim() ||
      "Price: On request";
    const packageDescription = card.querySelector(".service-description")?.textContent?.trim() || "";
    const specification = card.querySelector(".module-spec-input")?.value?.trim() || "";
    const features = Array.from(card.querySelectorAll(".module-points li, .plan-features li")).map((li) =>
      li.textContent.trim()
    );

    const pendingPayment = {
      serviceId: currentService.id,
      serviceTitle: currentService.title,
      subserviceTitle,
      priceText,
      packageDescription,
      specification,
      features,
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem("pendingPayment", JSON.stringify(pendingPayment));
    window.location.href = "/payment.html";
  });

  function clearTopSliderInterval() {
    if (topSliderIntervalId) {
      clearInterval(topSliderIntervalId);
      topSliderIntervalId = null;
    }
  }

  function renderTopSlider(service) {
    if (!topSlider) return;
    clearTopSliderInterval();
    topSlider.innerHTML = "";

    const slides = SERVICE_SLIDER_IMAGES[service.id];
    if (!Array.isArray(slides) || slides.length === 0) {
      topSlider.classList.add("hidden");
      return;
    }

    topSlider.classList.remove("hidden");
    topSlider.innerHTML = `
      <img
        class="service-top-slider-image"
        src="${slides[0]}"
        alt="${service.title} preview image"
        role="button"
        tabindex="0"
        aria-label="Show next image"
      />
      <div class="service-top-slider-controls">
        ${slides
          .map(
            (slide, index) => `
          <button
            class="service-top-slider-dot${index === 0 ? " is-active" : ""}"
            type="button"
            data-slide-src="${slide}"
            data-slide-index="${index}"
            aria-label="Show image ${index + 1}"
          ></button>
        `
          )
          .join("")}
      </div>
    `;

    const imageEl = topSlider.querySelector(".service-top-slider-image");
    const dots = Array.from(topSlider.querySelectorAll(".service-top-slider-dot"));
    if (!imageEl || dots.length < 2) return;

    let currentIndex = 0;
    const renderSlide = (index) => {
      const safeIndex = (index + dots.length) % dots.length;
      currentIndex = safeIndex;
      imageEl.src = dots[safeIndex].dataset.slideSrc || "";
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === safeIndex);
      });
    };

    const goToNext = () => renderSlide(currentIndex + 1);
    topSlider.addEventListener("click", (event) => event.stopPropagation());
    imageEl.addEventListener("click", goToNext);
    imageEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goToNext();
      }
    });
    dots.forEach((dot, dotIndex) => {
      dot.addEventListener("click", (event) => {
        event.stopPropagation();
        renderSlide(dotIndex);
      });
    });

    topSliderIntervalId = setInterval(goToNext, 30000);
  }

  function renderDetail(service) {
    currentService = service;
    renderTopSlider(service);
    title.textContent = service.title;
    description.textContent = service.description;

    if (service.id === "secure-web-development") {
      modules.innerHTML = `
        <div class="module-card">
          <h3>Static Web Development</h3>
          <ul class="module-points">
            <li>Simple informational website</li>
            <li>Home, About, Services, Contact</li>
            <li>No database</li>
          </ul>
          <div class="price-chip">Price: 3k</div>
          <label class="module-spec-label" for="desired-specification">Add your desired specification</label>
          <textarea
            id="desired-specification"
            class="module-spec-input"
            placeholder="Example: Color theme, sections, language, animation, contact details..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Business Website Development</h3>
          <ul class="module-points">
            <li>Company website</li>
            <li>Multiple pages</li>
            <li>Contact forms</li>
          </ul>
          <div class="price-chip">Price: 7k</div>
          <label class="module-spec-label" for="business-web-specification">Add your desired specification</label>
          <textarea
            id="business-web-specification"
            class="module-spec-input"
            placeholder="Example: Number of pages, required sections, inquiry form fields, brand style..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>E-commerce Website Development</h3>
          <ul class="module-points">
            <li>Product catalog</li>
            <li>Cart system</li>
            <li>Payment integration</li>
          </ul>
          <div class="price-chip">Price: 15k</div>
          <label class="module-spec-label" for="ecommerce-web-specification">Add your desired specification</label>
          <textarea
            id="ecommerce-web-specification"
            class="module-spec-input"
            placeholder="Example: Product count, categories, checkout flow, payment provider, shipping logic..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Web Application Development</h3>
          <ul class="module-points">
            <li>Custom system</li>
            <li>Dashboard</li>
            <li>Database</li>
          </ul>
          <div class="price-chip">Price: 30k</div>
          <label class="module-spec-label" for="web-app-specification">Add your desired specification</label>
          <textarea
            id="web-app-specification"
            class="module-spec-input"
            placeholder="Example: User roles, dashboard modules, reports, database needs, integrations..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Website Redesign</h3>
          <p class="service-description">Redesign and modification.</p>
          <div class="price-chip">Price: 1.5k</div>
          <label class="module-spec-label" for="website-redesign-specification">Add your desired specification</label>
          <textarea
            id="website-redesign-specification"
            class="module-spec-input"
            placeholder="Example: Existing website URL, pages to redesign, style changes..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
      `;
      return;
    }

    if (service.id === "logo-designing") {
      modules.innerHTML = `
        <div class="module-card">
          <h3>Basic Logo Design</h3>
          <p class="service-description">
            Simple logo for small businesses or startups.
          </p>
          <ul class="module-points">
            <li>1-2 logo concepts</li>
            <li>2 revisions</li>
            <li>PNG and JPG files</li>
          </ul>
          <div class="price-chip">Price: 2.5k</div>
          <label class="module-spec-label" for="basic-logo-specification">Add your desired specification</label>
          <textarea
            id="basic-logo-specification"
            class="module-spec-input"
            placeholder="Example: Brand name, preferred colors, style references, logo usage..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Professional Logo Design</h3>
          <p class="service-description">
            More polished logo with multiple concepts.
          </p>
          <ul class="module-points">
            <li>3-4 logo concepts</li>
            <li>4 revisions</li>
            <li>PNG, JPG, SVG files</li>
          </ul>
          <div class="price-chip">Price: 5k</div>
          <label class="module-spec-label" for="professional-logo-specification">Add your desired specification</label>
          <textarea
            id="professional-logo-specification"
            class="module-spec-input"
            placeholder="Example: Brand tone, concept ideas, color preferences, font style..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Premium Brand Logo Design</h3>
          <p class="service-description">
            Complete branding-focused logo.
          </p>
          <ul class="module-points">
            <li>5 logo concepts</li>
            <li>Unlimited revisions</li>
            <li>Full brand kit</li>
          </ul>
          <div class="price-chip">Price: 10k</div>
          <label class="module-spec-label" for="premium-logo-specification">Add your desired specification</label>
          <textarea
            id="premium-logo-specification"
            class="module-spec-input"
            placeholder="Example: Brand kit scope, logo usage, stationery, social media kit..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
      `;
      return;
    }

    if (service.id === "internet-marketing-seo") {
      modules.innerHTML = `
        <div class="module-card">
          <h3>Basic SEO Optimization</h3>
          <p class="service-description">
            For small websites starting SEO.
          </p>
          <ul class="module-points">
            <li>Keyword research</li>
            <li>On-page SEO optimization</li>
            <li>Meta tags and descriptions</li>
            <li>Basic performance improvement</li>
          </ul>
          <div class="price-chip">Price: 4k</div>
          <label class="module-spec-label" for="basic-seo-specification">Add your desired specification</label>
          <textarea
            id="basic-seo-specification"
            class="module-spec-input"
            placeholder="Example: Website URL, target keywords, pages to optimize..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Advanced SEO Service</h3>
          <p class="service-description">
            For businesses wanting stronger search visibility.
          </p>
          <ul class="module-points">
            <li>Keyword research</li>
            <li>On-page SEO</li>
            <li>Technical SEO audit</li>
            <li>Competitor analysis</li>
            <li>SEO report</li>
          </ul>
          <div class="price-chip">Price: 8k</div>
          <label class="module-spec-label" for="advanced-seo-specification">Add your desired specification</label>
          <textarea
            id="advanced-seo-specification"
            class="module-spec-input"
            placeholder="Example: Competitors, target locations, SEO priorities, current rankings..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Social Media Marketing</h3>
          <p class="service-description">
            Promoting business through social platforms.
          </p>
          <ul class="module-points">
            <li>Instagram / Facebook promotion</li>
            <li>Content posting</li>
            <li>Ad campaign setup</li>
            <li>Performance analytics</li>
          </ul>
          <div class="price-chip">Price: 10k</div>
          <label class="module-spec-label" for="social-marketing-specification">Add your desired specification</label>
          <textarea
            id="social-marketing-specification"
            class="module-spec-input"
            placeholder="Example: Platforms, target audience, posting frequency, ad budget..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
        <div class="module-card">
          <h3>Complete Digital Marketing Package</h3>
          <p class="service-description">
            Full online marketing solution.
          </p>
          <ul class="module-points">
            <li>SEO optimization</li>
            <li>Social media marketing</li>
            <li>Google Ads setup</li>
            <li>Monthly performance reports</li>
          </ul>
          <div class="price-chip">Price: 25k</div>
          <label class="module-spec-label" for="complete-marketing-specification">Add your desired specification</label>
          <textarea
            id="complete-marketing-specification"
            class="module-spec-input"
            placeholder="Example: Goals, monthly budget, channels, reporting expectations..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
      `;
      return;
    }

    if (service.id === "digital-growth-solutions") {
      modules.innerHTML = `
        <div class="module-card">
          <h3>Digital Growth & Marketing</h3>
          <ul class="module-points">
            <li>Business growth strategy</li>
            <li>Social media marketing</li>
            <li>Audience targeting</li>
            <li>Analytics and performance tracking</li>
          </ul>
          <div class="price-chip">Price: 12k</div>
          <label class="module-spec-label" for="digital-growth-marketing-specification">Add your desired specification</label>
          <textarea
            id="digital-growth-marketing-specification"
            class="module-spec-input"
            placeholder="Example: Growth goals, target audience, channels, campaign timeline..."
          ></textarea>
          <div class="module-actions">
            <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
            <a class="order-btn" href="/payment.html">Order Now</a>
          </div>
        </div>
      `;
      return;
    }

    if (service.id === "management-maintainance") {
      modules.innerHTML = `
        <div class="plan-grid">
          <div class="plan-card">
            <h3>Essential Plan</h3>
            <p class="plan-price">Price: 4k</p>
            <p class="plan-copy">
              Best for small websites that need basic monitoring and updates.
            </p>
            <p class="plan-includes">Includes:</p>
            <ul class="plan-features">
              <li>Website performance monitoring</li>
              <li>Basic security checks</li>
              <li>Minor bug fixes</li>
              <li>Content updates (text/images)</li>
              <li>Monthly website backup</li>
              <li>Email support</li>
            </ul>
            <label class="module-spec-label" for="essential-plan-specification">Add your desired specification</label>
            <textarea
              id="essential-plan-specification"
              class="module-spec-input"
              placeholder="Example: Website URL, update frequency, content update scope..."
            ></textarea>
            <div class="module-actions">
              <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
              <a class="order-btn" href="/payment.html">Order Now</a>
            </div>
          </div>
          <div class="plan-card">
            <h3>Premium Plan</h3>
            <p class="plan-price">Price: 8k</p>
            <p class="plan-copy">
              For businesses that need complete website maintenance and priority support.
            </p>
            <p class="plan-includes">Includes:</p>
            <ul class="plan-features">
              <li>Everything in Essential plan</li>
              <li>Regular website updates</li>
              <li>Advanced security monitoring</li>
              <li>Performance optimization</li>
              <li>Feature improvements</li>
              <li>Weekly backups</li>
              <li>Priority support</li>
            </ul>
            <label class="module-spec-label" for="premium-plan-specification">Add your desired specification</label>
            <textarea
              id="premium-plan-specification"
              class="module-spec-input"
              placeholder="Example: SLA needs, update priority, security and performance goals..."
            ></textarea>
            <div class="module-actions">
              <a class="contact-btn" href="/contact.html">For More Query Contact Us</a>
              <a class="order-btn" href="/payment.html">Order Now</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    modules.innerHTML = `
      <div class="module-card">
        <h3>Service Modules</h3>
        <p class="placeholder-note">Services will be added soon.</p>
      </div>
    `;
  }

  list.innerHTML = SERVICES.map(
    (service, index) => `
      <button
        type="button"
        class="service-tab ${index === 0 ? "active" : ""}"
        data-service-id="${service.id}"
        role="tab"
        aria-selected="${index === 0 ? "true" : "false"}"
      >
        ${service.title}
      </button>
    `
  ).join("");

  const initialService =
    SERVICES.find((service) => service.id === requestedServiceId) ||
    SERVICES[0];

  renderDetail(initialService);
  const initialTab = list.querySelector(`[data-service-id="${initialService.id}"]`);
  if (initialTab) {
    list.querySelectorAll(".service-tab").forEach((btn) => {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    });
    initialTab.classList.add("active");
    initialTab.setAttribute("aria-selected", "true");
  }

  list.querySelectorAll(".service-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = SERVICES.find((service) => service.id === tab.dataset.serviceId);
      if (!selected) return;
      list.querySelectorAll(".service-tab").forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      renderDetail(selected);
    });
  });
}

async function init() {
  setYear();
  setupNav();
  const authState = await setupAuthUi();
  setupServiceExplorer(authState);
}

init();
