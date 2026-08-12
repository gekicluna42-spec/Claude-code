/* Smoke test for the Eynna Hair homepage.
   Usage: start a static server on :5500, then `node verify.js`. */
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text());
  });

  await page.goto("http://localhost:5500/index.html", { waitUntil: "networkidle2" });

  let pass = 0;
  let fail = 0;
  const check = (name, ok) => {
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}`);
    ok ? pass++ : fail++;
  };

  // 1. Key sections present
  for (const sel of ["#top", "#kolekcija", "#materijali", "#zasto", "#kontakt", ".footer", ".marquee", ".quote"]) {
    check(`section ${sel} exists`, (await page.$(sel)) !== null);
  }

  // 2. Four collection cards
  const cards = await page.$$(".ccard");
  check("4 collection cards", cards.length === 4);

  // 3. Canvas is animating (frame counter advances)
  const f1 = await page.evaluate(() => window.__eynna.getFrames());
  await new Promise((r) => setTimeout(r, 600));
  const f2 = await page.evaluate(() => window.__eynna.getFrames());
  check(`hero canvas animating (${f1} → ${f2} frames)`, f2 > f1);

  // 4. Canvas has a sane drawing size
  const cv = await page.$eval("#heroCanvas", (c) => ({ w: c.width, h: c.height }));
  check(`canvas sized ${cv.w}x${cv.h}`, cv.w > 0 && cv.h > 0);

  // 5. Preloader dismisses
  await page.waitForFunction(
    () => document.getElementById("preloader").classList.contains("is-done"),
    { timeout: 6000 }
  );
  check("preloader dismissed", true);

  // 6. Nav gains scrolled state + reveals fire on scroll
  await page.evaluate(() => document.getElementById("kolekcija").scrollIntoView());
  await new Promise((r) => setTimeout(r, 900));
  check("nav has is-scrolled after scrolling", await page.$eval("#nav", (n) => n.classList.contains("is-scrolled")));
  const revealed = await page.$$eval("#kolekcija .reveal", (els) => els.filter((e) => e.classList.contains("is-visible")).length);
  check(`collection reveals fired (${revealed})`, revealed > 0);

  // 7. Bosnian copy sanity
  const heroText = await page.$eval(".hero__title", (el) => el.textContent);
  check("hero headline present", /Kosa/i.test(heroText));

  // 8. No console/page errors
  check("no JS errors", errors.length === 0);
  if (errors.length) console.log("  errors:", errors);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
