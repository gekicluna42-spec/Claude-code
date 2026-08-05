const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--autoplay-policy=no-user-gesture-required", "--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text());
  });

  await page.goto("http://localhost:5500/index.html", { waitUntil: "networkidle2" });

  // wait for JS-rendered cards
  await page.waitForSelector(".card .card__video", { timeout: 10000 });

  const cards = await page.$$(".card");
  console.log(`Found ${cards.length} product cards.`);

  let pass = 0;
  for (let i = 0; i < cards.length; i++) {
    const name = await cards[i].$eval(".card__name", (el) => el.textContent.trim());
    const media = await cards[i].$(".card__media");

    // scroll card into view first (extra offset so topmost card clears the fixed nav)
    await media.evaluate((el) => {
      el.scrollIntoView({ block: "center" });
      // if the element top is still under the ~70px fixed nav, nudge down
      const r = el.getBoundingClientRect();
      if (r.top < 90) window.scrollBy(0, r.top - 100);
    });
    await new Promise((r) => setTimeout(r, 300));

    // compute a hover point that is guaranteed inside the viewport
    const vp = page.viewport();
    const box = await media.boundingBox();
    let cx = Math.round(box.x + box.width / 2);
    let cy = Math.round(box.y + box.height / 2);
    // clamp into visible area (accounting for the fixed nav strip)
    cx = Math.max(4, Math.min(vp.width - 4, cx));
    cy = Math.max(90, Math.min(vp.height - 4, cy));

    const topInfo = await page.evaluate(
      (x, y) => {
        const el = document.elementFromPoint(x, y);
        return {
          isMedia: !!(el && el.closest(".card__media")),
          tag: el ? el.tagName : "none",
          cls: el ? el.className : "",
        };
      },
      cx,
      cy
    );
    console.log(`  (hover point → <${topInfo.tag} class="${topInfo.cls}"> isMedia=${topInfo.isMedia})`);


    // hover: move away first, then into the element so mouseenter fires
    await page.mouse.move(2, 2);
    await new Promise((r) => setTimeout(r, 80));
    await page.mouse.move(cx, cy, { steps: 10 });

    // give the video a moment to start; retry once if needed
    await new Promise((r) => setTimeout(r, 700));
    let started = await cards[i].$eval(".card__video", (v) => !v.paused && v.currentTime > 0);
    if (!started) {
      await page.mouse.move(2, 2);
      await new Promise((r) => setTimeout(r, 80));
      await page.mouse.move(cx, cy, { steps: 10 });
      await new Promise((r) => setTimeout(r, 800));
    }


    const state = await cards[i].$eval(".card__video", (v) => ({
      playing: v.classList.contains("is-playing"),
      paused: v.paused,
      currentTime: v.currentTime,
      readyState: v.readyState,
    }));

    const ok = state.playing && !state.paused && state.currentTime > 0;
    console.log(
      `  [${ok ? "PASS" : "FAIL"}] ${name} → is-playing=${state.playing} paused=${state.paused} t=${state.currentTime.toFixed(2)}s ready=${state.readyState}`
    );
    if (ok) pass++;

    // move away -> should pause
    await page.mouse.move(10, 10);
    await new Promise((r) => setTimeout(r, 400));
    const afterLeave = await cards[i].$eval(".card__video", (v) => ({
      playing: v.classList.contains("is-playing"),
      paused: v.paused,
    }));
    console.log(
      `         leave → is-playing=${afterLeave.playing} paused=${afterLeave.paused}`
    );
  }

  // countdown sanity
  const cdDays = await page.$eval("#cd-days", (el) => el.textContent);
  console.log(`Countdown days field: ${cdDays}`);

  console.log("\nJS/Console errors:", errors.length ? errors : "none");
  console.log(`\nRESULT: ${pass}/${cards.length} cards hover-to-play OK`);

  await browser.close();
  process.exit(pass === cards.length && cards.length === 3 ? 0 : 1);
})();
