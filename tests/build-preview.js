/**
 * Build a fully self-contained preview page from the theme's rendered output.
 *
 * The Artifact CSP blocks every external host, so CSS, JS and fonts are all
 * inlined — fonts as data: URIs.
 *
 * Usage: node tests/build-preview.js <render-dir> <out.html>
 */
const fs = require("fs");
const path = require("path");

const RENDER = process.argv[2];
const OUT = process.argv[3];
const THEME = path.join(__dirname, "..", "wordpress", "eynna-cinematic");

let html = fs.readFileSync(path.join(RENDER, "home-woo.html"), "utf8");

/* ---------- Inline fonts into the font stylesheet ---------- */
let fontCss = fs.readFileSync(path.join(THEME, "assets/css/fonts.css"), "utf8");
let inlined = 0;
fontCss = fontCss.replace(/url\(\.\.\/fonts\/([^)]+\.woff2)\)/g, (_, file) => {
  const buf = fs.readFileSync(path.join(THEME, "assets/fonts", file));
  inlined++;
  return `url(data:font/woff2;base64,${buf.toString("base64")})`;
});

const themeCss = fs.readFileSync(path.join(THEME, "style.css"), "utf8");
const wooCss = fs.readFileSync(path.join(THEME, "assets/css/woocommerce.css"), "utf8");
const mainJs = fs.readFileSync(path.join(THEME, "assets/js/eynna.js"), "utf8");
const heroJs = fs.readFileSync(path.join(THEME, "assets/js/eynna-hero.js"), "utf8");

/* ---------- Extract the body ---------- */
let body = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>"));
body = body.replace(/^<body[^>]*>/, "");

// Drop the stylesheet/script tags the shim emitted; everything is inlined below.
body = body.replace(/<link rel="stylesheet"[^>]*>\s*/g, "");
body = body.replace(/<script[^>]*><\/script>\s*/g, "");
body = body.replace(/<script>var eynnaHero[^<]*<\/script>\s*/g, "");

// The shim has no real product images; empty src attributes render as broken
// icons. Strip them so the CSS placeholder shows through instead.
body = body.replace(/<img src=''[^>]*\/?>/g, "");
body = body.replace(/<img src=""[^>]*\/?>/g, "");

/* ---------- Preview-only additions ---------- */
const previewCss = `
/* Preview only: product tiles have no photography in this mockup, so they get
   the same woven-strand placeholder the category cards use. */
.pcard__media {
	position: relative;
	background:
		repeating-linear-gradient(93deg,
			#1c1512 0px, #4a3323 1px, #1c1512 2px,
			#8a5a33 3px, #1c1512 5px, #4a3323 7px, #1c1512 9px),
		linear-gradient(180deg, #1c1512, #33241a);
	background-blend-mode: soft-light;
}
.pcard__media::after {
	content: "";
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse 70% 45% at 50% 20%, rgba(255, 240, 210, 0.18), transparent 65%),
		linear-gradient(to bottom, transparent 60%, rgba(10, 7, 5, 0.7));
}
.pcard:nth-child(2n) .pcard__media { filter: hue-rotate(-6deg) brightness(1.08); }
.pcard:nth-child(3n) .pcard__media { filter: hue-rotate(8deg) brightness(0.94); }
.ccard:nth-child(2n) .ccard__hair { filter: brightness(1.1); }
`;

const out = `<title>Eynna Cinematic</title>
<style>
${fontCss}
${themeCss}
${wooCss}
${previewCss}
</style>
${body}
<script>
${mainJs}
</script>
<script>
${heroJs}
</script>
`;

fs.writeFileSync(OUT, out);
console.log(`inlined ${inlined} font files`);
console.log(`${OUT} — ${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB`);
