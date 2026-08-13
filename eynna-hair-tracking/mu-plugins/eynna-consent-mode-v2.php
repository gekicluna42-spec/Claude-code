<?php
/**
 * Plugin Name: Eynna — Google Consent Mode v2 defaults
 * Description: Sets Consent Mode v2 defaults before any Google tag loads. Denies ad/analytics
 *              storage for EEA + UK visitors until a CMP grants it, and leaves BiH, RS and every
 *              other non-EEA market untouched.
 * Version:     1.0.0
 *
 * INSTALL: drop this file in wp-content/mu-plugins/ (create the folder if it does not exist).
 *          mu-plugins load automatically — there is nothing to activate.
 *
 * READ THIS FIRST: on its own this file only sets the DEFAULT state. For EEA and UK visitors
 * that default is "denied", which means Google receives cookieless pings and nothing more until
 * a consent banner calls gtag('consent','update',{...}). Deploy a CMP that supports Consent
 * Mode v2 (Complianz, CookieYes, Cookiebot) at the same time, or EEA analytics goes quiet.
 * Traffic from Bosnia and Herzegovina, Serbia, Montenegro and North Macedonia is granted by
 * default and is not affected either way.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Print the consent defaults as early as possible in <head>.
 *
 * Priority 0 on wp_head. Because mu-plugins are loaded before regular plugins this callback is
 * registered first, so at equal priority it prints ahead of DXPixelSuite's dxps-bootstrap and
 * dxps-gtag-init. Confirm with view-source after deploying: #eynna-consent-default must appear
 * above #dxps-gtag-init.
 */
add_action( 'wp_head', 'eynna_consent_mode_defaults', 0 );

function eynna_consent_mode_defaults() {

	// EEA + UK. Consent is withheld by default for these regions only.
	$restricted_regions = array(
		'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
		'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
		'SE', 'IS', 'LI', 'NO', 'GB',
	);

	$regions_json = wp_json_encode( $restricted_regions );
	?>
<script id="eynna-consent-default" data-no-optimize="1" data-no-defer="1" data-no-minify="1" data-cfasync="false">
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

/* EEA + UK: withheld until the consent banner updates it. */
gtag('consent', 'default', {
  ad_storage:            'denied',
  ad_user_data:          'denied',
  ad_personalization:    'denied',
  analytics_storage:     'denied',
  functionality_storage: 'granted',
  security_storage:      'granted',
  region:                <?php echo $regions_json; ?>,
  wait_for_update:       500
});

/* Everywhere else — BiH, RS, ME, MK and the rest — unchanged. */
gtag('consent', 'default', {
  ad_storage:            'granted',
  ad_user_data:          'granted',
  ad_personalization:    'granted',
  analytics_storage:     'granted',
  functionality_storage: 'granted',
  security_storage:      'granted'
});

gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
</script>
	<?php
}
