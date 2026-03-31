function loadServices() {
  const container = document.getElementById("services-grid");
  const services = [
    {
      id: "secure-web-development",
      title: "Secure Web Development",
      description:
        "We deliver custom, secure, and scalable web development solutions tailored to your business goals. Our experienced designers, developers, and analysts work together to create fast, reliable, and secure websites that strengthen your online presence while maintaining high performance and data protection standards.",
      sliderImages: [
        "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80",
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
      ],
    },
    {
      id: "logo-designing",
      title: "Logo Designing",
      description:
        "A strong brand starts with a memorable identity. Our logo design services focus on creating visually appealing and meaningful designs that reflect your brand values. We ensure every logo is unique, professional, and impactful, helping your business stand out in a competitive market.",
      sliderImages: ["/images/logo-designing.png"],
    },
    {
      id: "internet-marketing-seo",
      title: "Internet Marketing and SEO",
      description:
        "Online success begins with visibility. Our Internet Marketing and SEO services are designed to increase your website's reach, attract high-quality traffic, and improve search engine rankings. By combining proven SEO strategies with modern digital marketing techniques, we help businesses gain consistent visibility and long-term growth.",
      sliderImages: ["/images/internet-marketing-seo.png"],
    },
    {
      id: "digital-growth-solutions",
      title: "Digital Growth Solutions",
      description:
        "We go beyond development by offering complete digital growth solutions. From strategy planning to execution, we help businesses improve engagement, increase conversions, and build trust with their audience using data-driven and creative approaches.",
      sliderImages: ["/images/digital-growth-marketing.png"],
    },
    {
      id: "management-maintainance",
      title: "Management and Maintainance",
      description:
        "Comprehensive IT management and proactive maintenance designed to keep your infrastructure seamless, secure, and always-on. We handle the technology so you can focus on your business.",
      sliderImages: ["/images/maintenance-management.png"],
    },
  ];

  container.innerHTML = services
    .map(
      (service) => `
        <article class="service-card service-card-link" data-service-id="${service.id}" role="link" tabindex="0">
          ${
            Array.isArray(service.sliderImages) && service.sliderImages.length
              ? `
            <div class="service-image-slider" data-slider>
              <img
                class="service-slider-image"
                src="${service.sliderImages[0]}"
                alt="${service.title} preview image"
                role="button"
                tabindex="0"
                aria-label="Show next image"
              />
              <div class="service-slider-controls">
                ${service.sliderImages
                  .map(
                    (image, index) => `
                  <button
                    class="service-slider-dot${index === 0 ? " is-active" : ""}"
                    type="button"
                    data-slide-index="${index}"
                    data-slide-src="${image}"
                    aria-label="Show image ${index + 1}"
                  ></button>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
          <h3>${service.title}</h3>
          <p>${service.description}</p>
          <p class="service-cta">View in Services Ordering</p>
        </article>
      `
    )
    .join("");

  container.querySelectorAll(".service-card-link").forEach((card) => {
    const goToService = () => {
      const serviceId = card.dataset.serviceId;
      window.location.href = `/service-order.html?service=${encodeURIComponent(serviceId)}`;
    };
    card.addEventListener("click", goToService);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goToService();
      }
    });
  });

  setupServiceImageSliders();
}

function setupServiceImageSliders() {
  const sliders = document.querySelectorAll("[data-slider]");
  sliders.forEach((slider) => {
    const imageEl = slider.querySelector(".service-slider-image");
    const dots = Array.from(slider.querySelectorAll(".service-slider-dot"));
    if (!imageEl || dots.length === 0) return;

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
    const stopNavigation = (event) => event.stopPropagation();

    slider.addEventListener("click", stopNavigation);
    imageEl.addEventListener("click", goToNext);
    imageEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goToNext();
      }
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", (event) => {
        event.stopPropagation();
        renderSlide(index);
      });
    });

    setInterval(goToNext, 30000);
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

function setYear() {
  document.getElementById("year").textContent = String(new Date().getFullYear());
}

function setupNav() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");

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

function keepHomeAtTopOnLoad() {
  const { hash } = window.location;
  if (!hash) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return;
  }

  const target = document.querySelector(hash);
  if (target) {
    target.scrollIntoView({ behavior: "auto", block: "start" });
  }
}

function setupHomeHeroSlider() {
  const imageEl = document.getElementById("home-hero-image");
  if (!imageEl) return;

  const slides = [
    "/images/ChatGPT%20Image%20Mar%208,%202026,%2004_09_53%20PM.png",
    "/images/ChatGPT%20Image%20Mar%208,%202026,%2004_15_59%20PM.png",
    "/images/ChatGPT%20Image%20Mar%208,%202026,%2004_13_19%20PM.png",
    "/images/ChatGPT%20Image%20Mar%208,%202026,%2004_15_09%20PM.png",
  ];
  const fallbackSlides = [
    "/images/logo-designing.png",
    "/images/internet-marketing-seo.png",
    "/images/digital-growth-marketing.png",
    "/images/maintenance-management.png",
  ];

  const trySetSrc = (src, fallbackIndex) => {
    imageEl.onerror = () => {
      imageEl.onerror = null;
      imageEl.src = fallbackSlides[fallbackIndex % fallbackSlides.length];
    };
    imageEl.src = src;
  };

  trySetSrc(slides[0], 0);
  if (slides.length < 2) return;

  let index = 0;
  setInterval(() => {
    index = (index + 1) % slides.length;
    imageEl.classList.add("is-fading");
    setTimeout(() => {
      trySetSrc(slides[index], index);
      imageEl.classList.remove("is-fading");
    }, 220);
  }, 3000);
}

keepHomeAtTopOnLoad();
setupHomeHeroSlider();
loadServices();
setupContactForm();
setYear();
setupNav();
setupAuthUi();
