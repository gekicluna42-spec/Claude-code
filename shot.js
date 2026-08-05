const puppeteer = require("puppeteer");
(async () => {
  const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto("http://localhost:5500/index.html", { waitUntil: "networkidle2" });
  await p.waitForSelector(".card");
  await new Promise((r) => setTimeout(r, 800));
  await p.screenshot({ path: "preview-hero.png" });
  // scroll to grid
  await p.evaluate(() => document.getElementById("grid").scrollIntoView());
  await new Promise((r) => setTimeout(r, 600));
  await p.screenshot({ path: "preview-grid.png" });
  // open cart test
  await p.click("#cartBtn");
  await new Promise((r) => setTimeout(r, 500));
  const drawerOpen = await p.$eval("#drawer", (el) => el.classList.contains("is-open"));
  console.log("Cart drawer opens:", drawerOpen);
  await b.close();
  console.log("Screenshots saved: preview-hero.png, preview-grid.png");
})();
