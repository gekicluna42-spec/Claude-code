/* ===== EYNNA HAIR — cinematic homepage interactions ===== */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- PRELOADER ---------- */
const preloader = document.getElementById("preloader");
function dismissPreloader() {
  preloader.classList.add("is-done");
}
if (reducedMotion) dismissPreloader();
else {
  window.addEventListener("load", () => setTimeout(dismissPreloader, 900));
  // Safety: never trap the visitor behind the preloader
  setTimeout(dismissPreloader, 3000);
}

/* ---------- NAV SCROLL STATE ---------- */
const nav = document.getElementById("nav");
function onNavScroll() {
  nav.classList.toggle("is-scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", onNavScroll, { passive: true });
onNavScroll();

/* ---------- SCROLL REVEALS ---------- */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
);
revealEls.forEach((el) => io.observe(el));

/* ---------- HERO CANVAS: flowing golden strands ---------- */
const canvas = document.getElementById("heroCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/* Each strand is a horizontal bezier ribbon that undulates over time,
   like a lock of hair drifting in slow motion. */
const STRAND_COUNT = 46;
const strands = [];
for (let i = 0; i < STRAND_COUNT; i++) {
  const t = i / (STRAND_COUNT - 1);
  strands.push({
    baseY: 0.18 + t * 0.66,            // vertical band across the viewport
    amp: 26 + Math.random() * 60,      // wave amplitude (px)
    freq: 0.55 + Math.random() * 0.9,  // spatial frequency
    speed: 0.12 + Math.random() * 0.22,
    phase: Math.random() * Math.PI * 2,
    width: 0.5 + Math.random() * 1.4,
    // champagne-gold range, dimmer strands sit "deeper"
    hue: 36 + Math.random() * 10,
    sat: 42 + Math.random() * 26,
    lit: 28 + Math.random() * 34,
    alpha: 0.05 + Math.random() * 0.16,
    drift: (Math.random() - 0.5) * 0.05, // slow vertical drift
  });
}

let frames = 0; // exposed for the verify script

function drawFrame(time) {
  ctx.clearRect(0, 0, W, H);

  // deep backdrop wash so the strands emerge from darkness
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.08, W * 0.5, H * 0.5, H * 0.85);
  bg.addColorStop(0, "rgba(46, 32, 20, 0.55)");
  bg.addColorStop(1, "rgba(15, 11, 9, 0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const t = time * 0.001;
  const SEGS = 26;

  for (const s of strands) {
    const cy = (s.baseY + Math.sin(t * s.drift * 4 + s.phase) * 0.02) * H;
    ctx.beginPath();
    for (let j = 0; j <= SEGS; j++) {
      const x = (j / SEGS) * W;
      const wave =
        Math.sin((j / SEGS) * Math.PI * 2 * s.freq + t * s.speed * 2 + s.phase) * s.amp +
        Math.sin((j / SEGS) * Math.PI * 4.3 * s.freq + t * s.speed * 1.3 + s.phase * 1.7) * s.amp * 0.35;
      const y = cy + wave;
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${s.lit}%, ${s.alpha})`;
    ctx.lineWidth = s.width;
    ctx.stroke();
  }

  frames++;
}

if (reducedMotion) {
  drawFrame(1200); // single static frame
} else {
  const loop = (time) => {
    drawFrame(time);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* expose a tiny hook so automated checks can see the canvas is alive */
window.__eynna = { getFrames: () => frames };

/* ---------- HERO PARALLAX ---------- */
const heroContent = document.querySelector(".hero__content");
if (!reducedMotion && heroContent) {
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        heroContent.style.transform = `translateY(${y * 0.18}px)`;
        heroContent.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.85)));
      }
    },
    { passive: true }
  );
}
