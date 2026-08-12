<?php
/**
 * WooCommerce integration.
 *
 * Deliberately hooks-only. This theme ships no WooCommerce template overrides,
 * so product data, variations, cart and checkout keep rendering through Woo's
 * own templates and stay correct across Woo updates.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Swap Woo's default wrappers for the theme's containers.
 */
remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );

/**
 * Open the shop container.
 */
function eynna_woo_wrapper_start() {
	echo '<div class="site-content woo-content"><main id="primary" class="site-main">';
}
add_action( 'woocommerce_before_main_content', 'eynna_woo_wrapper_start', 10 );

/**
 * Close the shop container.
 */
function eynna_woo_wrapper_end() {
	echo '</main></div>';
}
add_action( 'woocommerce_after_main_content', 'eynna_woo_wrapper_end', 10 );

/**
 * Products per row on shop and archive pages.
 *
 * @return int
 */
function eynna_woo_columns() {
	return 3;
}
add_filter( 'loop_shop_columns', 'eynna_woo_columns' );

/**
 * Keep the header cart badge in sync with Woo's AJAX fragments.
 *
 * @param array $fragments Fragment map.
 * @return array
 */
function eynna_cart_fragment( $fragments ) {
	ob_start();
	printf(
		'<span class="cart-count" id="eynna-cart-count">%s</span>',
		esc_html( (string) eynna_cart_count() )
	);
	$fragments['#eynna-cart-count'] = ob_get_clean();
	return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'eynna_cart_fragment' );
