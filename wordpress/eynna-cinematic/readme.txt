=== Eynna Cinematic ===

Contributors: Eynna Hair
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Cinematic dark-and-champagne theme for a WooCommerce hair studio.


== Read this first ==

This theme changes how your site LOOKS. It does not change what your site
CONTAINS.

All of your pages, products, prices, categories, images and blog posts live in
the WordPress database, not in the theme. Switching themes never edits them.
Your content is all still there after activating, and it is all still there if
you switch back.

Even so: test on a staging copy before activating on the live shop. That is
normal practice for any theme change on a store that takes orders, and it lets
you re-assign menus calmly instead of under pressure.


== Installing ==

1. WordPress admin -> Appearance -> Themes -> Add New -> Upload Theme.
2. Choose eynna-cinematic.zip and click Install Now.
3. Click Activate.

After activating, three things need one-time setup, because WordPress stores
them per theme rather than globally:

1. Appearance -> Menus. Assign your existing menu to "Glavni meni" (and
   optionally "Meni u podnožju"). Until you do, the theme lists your pages
   automatically, so navigation still works — it just is not in your order.

2. Appearance -> Widgets. Re-place any widgets you had in the sidebar and
   footer areas.

3. Appearance -> Customize -> Site Identity. Upload your logo if you want it
   instead of the site name.


== The cinematic homepage ==

The homepage is opt-in. Activating the theme does NOT replace your current
front page — your existing homepage keeps rendering its own content exactly as
before.

To use it:

1. Pages -> add a new page (or edit an existing one).
2. In the page settings, set Template to "Kinematska naslovnica".
3. Settings -> Reading -> set that page as your static front page.

The template pulls live data from your shop: product categories become the
collection cards, featured products fill the "Izdvojeno" strip, and recent
posts fill "Vodiči". Nothing is hardcoded. If you write content in the page
editor as well, it renders below the cinematic sections — assigning this
template never hides anything.


== The scroll-driven video hero ==

The hero has three modes and picks one automatically:

* A video is set    -> scrolling scrubs through the video frame by frame.
* No video          -> an animated canvas of flowing golden strands. This is
                       the default and needs no media at all.
* Reduced motion,
  or a phone screen -> a still poster image, or a single painted frame.

Scrubbing is deliberately disabled below 768px wide. Mobile browsers,
iOS especially, handle programmatic video seeking badly, and a janky hero is
worse than a still one.

To add a video: Appearance -> Customize -> Eynna -> Hero sekcija -> Hero video.
Upload an MP4 through the Media Library and pick it there. Also set a poster
image while you are in there — it is what phones and reduced-motion visitors
see.

Video tips: keep it under about 10 seconds and a few MB, H.264 MP4, no audio.
A single continuous camera move scrubs far better than a clip with cuts.


== Customizer options ==

Appearance -> Customize -> Eynna:

* Hero sekcija  — video, poster, headline, subheading, both button labels and
                  links
* Zašto Eynna   — the four trust cards, including the 15% discount card
* Citat         — the pull quote and its attribution
* Kontakt       — Instagram, Facebook and YouTube links
* Boje          — the base dark colour and the gold accent

All text defaults to Bosnian and is translation-ready via the eynna-cinematic
text domain.


== WooCommerce ==

The theme declares WooCommerce support and styles it with CSS and action
hooks. It deliberately ships no WooCommerce template overrides.

That matters: themes that copy Woo's template files into themselves are the
usual reason carts break, product fields vanish, or checkout misbehaves after
an update. Because this theme overrides none of them, your product data,
variations, cart and checkout keep coming from WooCommerce itself and keep
working across Woo updates.


== Page builders ==

Pages render through the_content() untouched, so Elementor, WPBakery, Divi and
classic-editor layouts display as they did before.

For builder pages that manage their own width, set the page template to
"Puna širina (bez bočne trake)".


== Privacy and performance ==

Fonts (Playfair Display and Manrope) are bundled with the theme and served
from your own domain. The theme makes no external requests, which keeps it
GDPR-friendly for EU visitors and removes a third-party dependency.


== Going back ==

Appearance -> Themes -> activate your previous theme. Your content, products
and orders are untouched. Menus and widgets return to how that theme had them.


== Changelog ==

= 1.0.0 =
* Initial release.
