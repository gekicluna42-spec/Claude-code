# eynna-hair.ba — tracking fix pack

Audit basis: `view-source` of the homepage (page 19487) and a product page
(`/proizvod/bob-perika-piano-pramenovi-41cm-prirodna-kosa/`, product 21574), both captured while
logged in as `admin`.

**Decision: keep DXPixelSuite. Do not migrate to GTM.** There is no GTM container on the site —
the `googletagmanager.com` preconnect is gtag.js's host, not a `GTM-XXXXXXX` container. Everything
below is a config or compliance defect, not an architecture one, and a GTM migration would fix none
of them while costing the Meta CAPI deduplication that already works.

Ordered by impact. Items 1–2 are the ones actually losing money.

---

## 1. gtag.js is still delayed — GA4 and Google Ads lose fast bounces

**Where:** TurboPress → `wp-admin/options-general.php?page=turbopress`

On the product page the DXPixelSuite scripts have been freed from `type="tp-delay"`, but the Google
library loader has not:

```html
<script type="tp-delay" async ... src="https://www.googletagmanager.com/gtag/js?id=G-DC9KKZYJ60"></script>
```

`dxps-gtag-init` now runs immediately, but it only does `dataLayer.push(...)` into the stub from
`dxps-bootstrap`. The commands queue. Nothing reaches Google until gtag.js downloads — on first
interaction, or at TurboPress's 10-second `setTimeout` fallback. A visitor who lands and leaves
inside 10s without interacting produces **no GA4 pageview and no `view_item`**. Meta gets the event;
Google gets nothing.

**Fix:** add to TurboPress's delay-exclusion list:

```
googletagmanager.com/gtag/js
eynna-consent-default
```

**Also:** the homepage capture still had *every* dxps script delayed. Either it was fixed after that
capture or the homepage is serving stale cache. **Purge the homepage cache and re-check** — the
exclusion has to apply site-wide.

**Verify:** open the homepage and a product page in incognito, view-source, confirm no tracking
script carries `type="tp-delay"`. Then compare a week of GA4 sessions against server logs; the gap
should close.

---

## 2. Pixel item IDs will not match the product feed

**Where:** DXPixelSuite settings, or its source if there is no setting.

The `view_item` event on product 21574 emits:

```json
{"id":"21574","brand":"Eynna Hair","price":800,"category":"Prirodne perike - Premium kvalitet"}
```

`21574` is the **WordPress post ID**. The product's SKU is `EH-PER-NAT-BOB-PIANO-41`.

For Meta catalog ads and Google dynamic remarketing to match, the ID in the pixel event must equal
the ID in the product feed. If the feed keys on SKU, these events match nothing — no Advantage+
catalog, no dynamic product ads, no dynamic remarketing. Those are the highest-ROAS formats for a
store like this.

**Fix:** check what ID the Meta catalog and Merchant Center feed use, then make DXPixelSuite emit the
same one. If the plugin has no setting for it, this is the change to request from its developer.

**Same event, smaller mismatches:**

- `brand` is `"Eynna Hair"` here but `"Eynna Human hair"` in the product schema and og tags.
- Only one of the product's two categories is passed (`post_category` in the Meta ctx has both).

---

## 3. Google Ads has no conversion action wired

**Where:** DXPixelSuite settings → the field backing `dxpsCfg.gadsLead`

```json
"gadsLead": ""
```

Empty. `AW-356043487` is configured with `allow_enhanced_conversions: true` — enhanced conversions
switched on with nothing to enhance. Smart bidding is currently optimising on pageviews.

**Fix:** create the conversion action in Google Ads, paste its label into `gadsLead`. Do this after
item 4 so consent is in place before enhanced conversions start sending user-provided data.

---

## 4. Consent Mode v2 — `mu-plugins/eynna-consent-mode-v2.php` in this folder

**Where:** copy the file to `wp-content/mu-plugins/`

Current state is an empty stub: `window.dxpsConsent = function(){}`. No `gtag('consent', ...)` call,
no cookie banner anywhere in the document. The site ships to **BiH · HR · RS · SI · DE** — Croatia,
Slovenia and Germany are EEA, so GDPR applies to that traffic and Consent Mode v2 gates Google Ads
remarketing and audience signal there.

The mu-plugin sets the defaults only. **It must ship alongside a CMP that supports Consent Mode v2**
(Complianz, CookieYes, Cookiebot) — without a banner calling `gtag('consent','update',...)`, EEA
traffic stays denied and sends cookieless pings only. BiH and RS traffic is granted by default and
is unaffected.

**Verify:** view-source and confirm `#eynna-consent-default` prints *above* `#dxps-gtag-init`.

---

## 5. Admin traffic is tracked

The pixel captures `user_role: "administrator"` and then fires `PageView` regardless. Every page
edit while logged in pollutes retargeting audiences and Advantage+ signal.

**Fix:** a plugin setting if one exists; otherwise a guard in DXPixelSuite's output. The plugin
already knows the role — it just doesn't gate on it.

---

## 6. The WhatsApp click, the primary conversion, is unreliable

Click to Chat is configured with `gtm_event_name: "Click to Chat"` and `"ref": "dataLayer push"`,
pushing to a dataLayer **no container reads**. Its GA4 path (`g_an_event_name: "click to chat"`)
depends on gtag.js being loaded — which item 1 delays, so the click becomes a race between gtag.js
downloading and the handler firing.

**Fix:** item 1 removes the race. Then confirm the GA4 event actually lands in DebugView, and drop
the dead GTM config.

---

## 7. Smaller items

- **`currency` missing from `view_item` params.** `value: 800` is present; currency lives separately
  in `dxpsCfg.currency = "BAM"`. GA4 ignores `value` without a matching `currency` on the same event.
  The plugin may inject it inside `dxpsFire` — **verify in GA4 DebugView**.
- **No Meta `ViewContent` observed.** The events array is GA4-shaped only. If `dxpsFire` doesn't also
  emit `fbq('track','ViewContent',{content_ids, value, currency})`, Meta only ever sees `PageView`.
  **Check in Meta Pixel Helper.**
- **No `add_to_cart` event observed.** `clicks: 1` is on and the AJAX buttons carry `data-product_id`,
  so the plugin may hook them. Not verifiable from source — test it live.
- **HubSpot mislabels products.** `_hsq.push(["setContentType","blog-post"])` and
  `leadin_wordpress.pageType = "post"` on a WooCommerce product. HubSpot is also still `tp-delay`'d.
  Worth deciding whether HubSpot is in use at all — it is a third tracking layer needing its own
  consent gate, alongside Chatbase.

---

## Still unverified

**`purchase` has never been observed.** Place a test order (cash on delivery is fine) and capture
`view-source` of `/checkout/order-received/...`. That page is where order value and the CAPI dedup
ID fire — the number that matters most, and the one gap left in this audit.

---

## Outside tracking scope

Flagged, not changed:

- WhatsApp number is `+387 67 14 97 444` on-page but `+387644455557` in the Organization schema.
- Two conflicting Instagram handles across two JSON-LD blocks: `eynnahairekstenzije` (Rank Math
  Organization) vs `eynna.hair` (hand-rolled `HairSalon` block, which also has `"image": ""`).
