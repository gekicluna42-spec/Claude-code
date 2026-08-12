/**
 * Screenshot the shim-rendered theme templates.
 *
 * Usage: node tests/shoot-theme.js <render-dir> <port>
 * Expects a static server already serving <render-dir> on <port>.
 */
const puppeteer = require("puppeteer");

const PORT = process.argv[3] || 5600;
const OUT = process.argv[2] || ".";

const SHOTS = [
  { page: "home-woo", name: "theme-home-top", scroll: 0 },
  { page: "home-woo", name: "theme-home-collection", selector: "#kolekcija" },
  { page: "home-woo", name: "theme-home-featured", selector: "#izdvojeno" },
  { page: "home-woo", name: "theme-home-materials", selector: "#materijali" },
  { page: "home-woo", name: "theme-home-why", selector: "#zasto" },
  { page: "home-woo", name: "theme-home-contact", selector: "#kontakt" },
  { page: "index", name: "theme-blog", scroll: 0 },
  { page: "single", name: "theme-single", scroll: 0 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text());
  });

  for (const shot of SHOTS) {
    await page.goto(`http://localhost:${PORT}/${shot.page}.html`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 900));

    if (shot.selector) {
      const found = await page.$(shot.selector);
      if (!found) {
        console.log(`  [skip] ${shot.name} — ${shot.selector} not present`);
        continue;
      }
      await page.evaluate((s) => document.querySelector(s).scrollIntoView(), shot.selector);
      await new Promise((r) => setTimeout(r, 1200));
    }

    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    console.log(`  captured ${shot.name}`);
  }

  // Mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(`http://localhost:${PORT}/home-woo.html`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/theme-mobile.png` });
  console.log("  captured theme-mobile");

  console.log("\nJS errors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
