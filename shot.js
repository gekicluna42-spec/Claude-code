/* Screenshot capture for the Eynna Hair homepage.
   Usage: start a static server on :5500, then `node shot.js`. */
const puppeteer = require("puppeteer");

(async () => {
  const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

  // Desktop
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto("http://localhost:5500/index.html", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3500)); // let preloader clear + hero settle
  await p.screenshot({ path: "preview-hero.png" });

  await p.evaluate(() => document.getElementById("kolekcija").scrollIntoView());
  await new Promise((r) => setTimeout(r, 1400));
  await p.screenshot({ path: "preview-kolekcija.png" });

  await p.evaluate(() => document.getElementById("materijali").scrollIntoView());
  await new Promise((r) => setTimeout(r, 1400));
  await p.screenshot({ path: "preview-materijali.png" });

  await p.evaluate(() => document.getElementById("zasto").scrollIntoView());
  await new Promise((r) => setTimeout(r, 1400));
  await p.screenshot({ path: "preview-zasto.png" });

  await p.evaluate(() => document.getElementById("kontakt").scrollIntoView());
  await new Promise((r) => setTimeout(r, 1400));
  await p.screenshot({ path: "preview-kontakt.png" });

  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1400));
  await p.screenshot({ path: "preview-footer.png" });

  // Mobile
  const m = await b.newPage();
  await m.setViewport({ width: 390, height: 844, isMobile: true });
  await m.goto("http://localhost:5500/index.html", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3500));
  await m.screenshot({ path: "preview-mobile-hero.png" });

  await b.close();
  console.log("Screenshots saved.");
})();
