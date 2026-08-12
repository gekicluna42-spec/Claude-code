// WordPress theme screenshots must be 1200x900.
const puppeteer = require("puppeteer");
(async () => {
  const b = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 900 });
  await p.goto("http://localhost:5600/home-woo.html", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2000));
  await p.screenshot({ path: process.argv[2], clip: { x: 0, y: 0, width: 1200, height: 900 } });
  await b.close();
  console.log("ok");
})();
