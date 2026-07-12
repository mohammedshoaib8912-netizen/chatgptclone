const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".reveal");
const counters = document.querySelectorAll("[data-counter]");
const year = document.querySelector("#year");

year.textContent = new Date().getFullYear();

menuToggle.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  siteNav.classList.toggle("open");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.18 }
);

sections.forEach((section) => revealObserver.observe(section));

const activeLinkObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${entry.target.id}`;
        link.classList.toggle("active", isActive);
      });
    });
  },
  { threshold: 0.55 }
);

document.querySelectorAll("section[id]").forEach((section) => activeLinkObserver.observe(section));

const animateCounter = (element, target) => {
  const duration = 1200;
  const startTime = performance.now();

  const tick = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    element.textContent = Math.floor(progress * target);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = target;
    }
  };

  requestAnimationFrame(tick);
};

const heroStats = document.querySelector(".hero-stats");
if (heroStats) {
  const startCounters = () => {
    counters.forEach((counter) => {
      animateCounter(counter, Number(counter.dataset.counter));
    });
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(startCounters, 200);
  } else {
    window.addEventListener("load", () => setTimeout(startCounters, 200), { once: true });
  }
}