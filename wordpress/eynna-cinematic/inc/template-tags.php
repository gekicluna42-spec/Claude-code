<?php
/**
 * Reusable output helpers.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Section heading: small gold index line above a serif title.
 *
 * @param string $index Eyebrow text, e.g. "01 / Kolekcija".
 * @param string $title Title HTML. <em> is allowed and renders gold.
 * @param bool   $center Whether to center the block.
 */
function eynna_section_head( $index, $title, $center = false ) {
	printf(
		'<div class="section-head%1$s reveal"><p class="section-head__index">%2$s</p><h2 class="section-head__title">%3$s</h2></div>',
		$center ? ' section-head--center' : '',
		esc_html( $index ),
		wp_kses( $title, array( 'em' => array(), 'br' => array() ) )
	);
}

/**
 * Scrolling marquee strip.
 *
 * @param string[] $items Words to scroll.
 */
function eynna_marquee( $items = array() ) {
	if ( empty( $items ) ) {
		$items = array(
			esc_html__( 'Perike', 'eynna-cinematic' ),
			esc_html__( 'Ekstenzije', 'eynna-cinematic' ),
			esc_html__( 'Repovi', 'eynna-cinematic' ),
			esc_html__( 'Topperi', 'eynna-cinematic' ),
			esc_html__( 'Prirodna ljudska kosa', 'eynna-cinematic' ),
		);
	}

	echo '<div class="marquee" aria-hidden="true"><div class="marquee__track">';
	// Printed twice so the CSS translateX(-50%) loop is seamless.
	for ( $pass = 0; $pass < 2; $pass++ ) {
		foreach ( $items as $item ) {
			printf( '<span>%s</span><i>&#9679;</i>', esc_html( $item ) );
		}
	}
	echo '</div></div>';
}

/**
 * Post date and category line.
 */
function eynna_post_meta() {
	echo '<div class="entry-meta">';
	printf(
		'<time class="entry-date" datetime="%1$s">%2$s</time>',
		esc_attr( get_the_date( DATE_W3C ) ),
		esc_html( get_the_date() )
	);

	$categories = get_the_category_list( ', ' );
	if ( $categories ) {
		echo '<span class="entry-meta__sep">&middot;</span>';
		echo wp_kses_post( $categories );
	}
	echo '</div>';
}

/**
 * Previous/next links styled for the theme.
 */
function eynna_pagination() {
	the_posts_pagination(
		array(
			'mid_size'           => 1,
			'prev_text'          => esc_html__( 'Prethodna', 'eynna-cinematic' ),
			'next_text'          => esc_html__( 'Sljedeća', 'eynna-cinematic' ),
			'screen_reader_text' => esc_html__( 'Navigacija kroz objave', 'eynna-cinematic' ),
		)
	);
}

/**
 * Featured image wrapped for the card treatment.
 *
 * @param string $size Image size name.
 */
function eynna_post_thumbnail( $size = 'large' ) {
	if ( ! has_post_thumbnail() || post_password_required() || is_attachment() ) {
		return;
	}
	echo '<div class="entry-media">';
	if ( is_singular() ) {
		the_post_thumbnail( $size );
	} else {
		printf( '<a href="%s" tabindex="-1" aria-hidden="true">', esc_url( get_permalink() ) );
		the_post_thumbnail( $size );
		echo '</a>';
	}
	echo '</div>';
}

/**
 * Cart item count for the header badge.
 *
 * Defined here rather than in inc/woocommerce.php so it always exists: that
 * file is only required when WooCommerce is active at load time, but the
 * header can reach this whenever the class is present.
 *
 * @return int
 */
function eynna_cart_count() {
	if ( ! function_exists( 'WC' ) ) {
		return 0;
	}

	$wc = WC();
	if ( ! $wc || ! isset( $wc->cart ) || ! $wc->cart ) {
		return 0;
	}

	return (int) $wc->cart->get_cart_contents_count();
}

/**
 * Social links from the Customizer, rendered only when filled in.
 */
function eynna_social_links() {
	$links = array(
		'instagram' => get_theme_mod( 'eynna_instagram', 'https://www.instagram.com/eynnahairekstenzije/' ),
		'facebook'  => get_theme_mod( 'eynna_facebook', 'https://www.facebook.com/eynnahairekstenzije/' ),
		'youtube'   => get_theme_mod( 'eynna_youtube', 'https://www.youtube.com/@EynnahairSarajevo' ),
	);

	$labels = array(
		'instagram' => esc_html__( 'Instagram', 'eynna-cinematic' ),
		'facebook'  => esc_html__( 'Facebook', 'eynna-cinematic' ),
		'youtube'   => esc_html__( 'YouTube', 'eynna-cinematic' ),
	);

	$links = array_filter( $links );
	if ( empty( $links ) ) {
		return;
	}

	echo '<div class="social-links">';
	foreach ( $links as $key => $url ) {
		printf(
			'<a class="social-links__item" href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a>',
			esc_url( $url ),
			esc_html( $labels[ $key ] )
		);
	}
	echo '</div>';
}
