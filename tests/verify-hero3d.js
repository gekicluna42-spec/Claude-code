/**
 * Verify the scroll-driven 3D hero.
 *
 * Usage: node tests/verify-hero3d.js <port>
 * Expects a static server already serving the rendered pages.
 */
const puppeteer = require("puppeteer");

const PORT = process.argv[2] || 5600;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    // Headless Chromium needs a software rasteriser to expose WebGL2.
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    const t = m.text();
    // The bare static server has no favicon; that 404 is not a page defect.
    if (m.type() === "error" && !/Failed to load resource/.test(t)) {
      errors.push("CONSOLE: " + t);
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon")) {
      errors.push(`${r.status()} ${r.url()}`);
    }
  });

  let pass = 0;
  let fail = 0;
  const check = (name, ok, detail) => {
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
    ok ? pass++ : fail++;
  };

  await page.goto(`http://localhost:${PORT}/home-woo.html`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  // 1. WebGL2 is actually available in this browser
  const hasWebGL2 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  });
  check("WebGL2 context available", hasWebGL2);

  // 2. The 3D tier took over, not the 2D fallback
  const active = await page.evaluate(() => ({
    has3d: !!window.__eynna3d,
    strands: window.__eynna3d ? window.__eynna3d.strands : 0,
    canvas2dHidden: (document.getElementById("eynna-hero-canvas") || {}).style?.display === "none",
    glSized: (() => {
      const el = document.getElementById("eynna-hero-gl");
      return el ? el.width > 0 && el.height > 0 : false;
    })(),
  }));
  check("3D hero active", active.has3d, `${active.strands} strands`);
  check("2D canvas fallback hidden", active.canvas2dHidden);
  check("GL canvas has a backing store", active.glSized);

  // 3. It is animating
  const f1 = await page.evaluate(() => window.__eynna3d.getFrames());
  await new Promise((r) => setTimeout(r, 700));
  const f2 = await page.evaluate(() => window.__eynna3d.getFrames());
  check("frames advancing", f2 > f1, `${f1} → ${f2}`);

  // 4. Scroll actually drives the camera uniform
  const s0 = await page.evaluate(() => window.__eynna3d.getScroll());
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.1));
  await new Promise((r) => setTimeout(r, 1600));
  const s1 = await page.evaluate(() => window.__eynna3d.getScroll());
  check("scroll drives the camera", s1 > s0 + 0.02, `${s0.toFixed(3)} → ${s1.toFixed(3)}`);

  // 5. Something is actually drawn (non-empty framebuffer)
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 900));
  // The drawing buffer is cleared after compositing, so redraw and read within
  // the same task rather than sampling a stale buffer.
  const lit = await page.evaluate(() => {
    const el = document.getElementById("eynna-hero-gl");
    const gl = el.getContext("webgl2");
    window.__eynna3d.redraw(performance.now());
    const w = el.width;
    const h = el.height;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let n = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
    return n;
  });
  check("strands rendered to framebuffer", lit > 2000, `${lit} lit pixels`);

  // 6. No JS errors
  check("no JS errors", errors.length === 0);
  if (errors.length) console.log("  errors:", errors);

  // 7. Fallback still works when WebGL is unavailable
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await page2.evaluateOnNewDocument(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === "webgl2" || type === "webgl") return null;
      return orig.call(this, type, ...rest);
    };
  });
  await page2.goto(`http://localhost:${PORT}/home-woo.html`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  const fallback = await page2.evaluate(() => ({
    no3d: !window.__eynna3d,
    canvas2d: !!(window.__eynna && window.__eynna.getFrames() > 0),
  }));
  check("falls back to 2D canvas without WebGL", fallback.no3d && fallback.canvas2d);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
