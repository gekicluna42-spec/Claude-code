<?php
/**
 * Eynna Cinematic — theme setup.
 *
 * Design goal: replace presentation only. Every template renders whatever is
 * already in the database, so activating this theme never alters page, product
 * or post content.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'EYNNA_VERSION', '1.0.0' );

if ( ! isset( $content_width ) ) {
	$content_width = 1200;
}

/**
 * Theme supports, menus and widget areas.
 */
function eynna_setup() {
	load_theme_textdomain( 'eynna-cinematic', get_template_directory() . '/languages' );

	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'customize-selective-refresh-widgets' );
	add_theme_support( 'editor-styles' );

	add_theme_support(
		'html5',
		array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' )
	);

	add_theme_support(
		'custom-logo',
		array(
			'height'      => 60,
			'width'       => 240,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	// WooCommerce: declare support and let Woo render its own templates.
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );

	register_nav_menus(
		array(
			'primary' => esc_html__( 'Glavni meni', 'eynna-cinematic' ),
			'footer'  => esc_html__( 'Meni u podnožju', 'eynna-cinematic' ),
		)
	);
}
add_action( 'after_setup_theme', 'eynna_setup' );

/**
 * Widget areas.
 */
function eynna_widgets_init() {
	register_sidebar(
		array(
			'name'          => esc_html__( 'Bočna traka', 'eynna-cinematic' ),
			'id'            => 'sidebar-1',
			'description'   => esc_html__( 'Prikazuje se na blogu i arhivama.', 'eynna-cinematic' ),
			'before_widget' => '<section id="%1$s" class="widget %2$s">',
			'after_widget'  => '</section>',
			'before_title'  => '<h2 class="widget-title">',
			'after_title'   => '</h2>',
		)
	);

	for ( $i = 1; $i <= 3; $i++ ) {
		register_sidebar(
			array(
				/* translators: %d: footer widget area number. */
				'name'          => sprintf( esc_html__( 'Podnožje %d', 'eynna-cinematic' ), $i ),
				'id'            => 'footer-' . $i,
				'before_widget' => '<section id="%1$s" class="widget %2$s">',
				'after_widget'  => '</section>',
				'before_title'  => '<h4 class="widget-title">',
				'after_title'   => '</h4>',
			)
		);
	}
}
add_action( 'widgets_init', 'eynna_widgets_init' );

/**
 * Styles and scripts. Fonts are self-hosted: no external requests.
 */
function eynna_scripts() {
	$dir = get_template_directory_uri();

	wp_enqueue_style( 'eynna-fonts', $dir . '/assets/css/fonts.css', array(), EYNNA_VERSION );
	wp_enqueue_style( 'eynna-style', get_stylesheet_uri(), array( 'eynna-fonts' ), EYNNA_VERSION );

	if ( class_exists( 'WooCommerce' ) ) {
		wp_enqueue_style( 'eynna-woocommerce', $dir . '/assets/css/woocommerce.css', array( 'eynna-style' ), EYNNA_VERSION );
	}

	wp_enqueue_script( 'eynna-script', $dir . '/assets/js/eynna.js', array(), EYNNA_VERSION, true );

	// The hero bundle is only needed where a hero is actually rendered.
	if ( eynna_has_hero() ) {
		// The 3D renderer must be parsed before the controller that uses it.
		wp_enqueue_script( 'eynna-hero-3d', $dir . '/assets/js/eynna-hero-3d.js', array(), EYNNA_VERSION, true );
		wp_enqueue_script( 'eynna-hero', $dir . '/assets/js/eynna-hero.js', array( 'eynna-hero-3d' ), EYNNA_VERSION, true );
		wp_localize_script(
			'eynna-hero',
			'eynnaHero',
			array(
				'video'  => esc_url( eynna_get_hero_video_url() ),
				'poster' => esc_url( eynna_get_hero_poster_url() ),
			)
		);
	}

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'eynna_scripts' );

/**
 * True when the current view renders the cinematic hero.
 *
 * @return bool
 */
function eynna_has_hero() {
	return is_page_template( 'page-templates/cinematic-home.php' );
}

/**
 * Hero video URL from the Customizer. Empty string means "no video".
 *
 * @return string
 */
function eynna_get_hero_video_url() {
	return (string) get_theme_mod( 'eynna_hero_video', '' );
}

/**
 * Hero poster image URL from the Customizer.
 *
 * @return string
 */
function eynna_get_hero_poster_url() {
	return (string) get_theme_mod( 'eynna_hero_poster', '' );
}

/**
 * Expose the palette as CSS custom properties so the Customizer colors apply.
 */
function eynna_custom_properties() {
	$ink  = get_theme_mod( 'eynna_color_ink', '#0f0b09' );
	$gold = get_theme_mod( 'eynna_color_gold', '#d9b878' );

	printf(
		'<style id="eynna-custom-properties">:root{--ink:%1$s;--gold:%2$s;}</style>',
		esc_html( sanitize_hex_color( $ink ) ? $ink : '#0f0b09' ),
		esc_html( sanitize_hex_color( $gold ) ? $gold : '#d9b878' )
	);
}
add_action( 'wp_head', 'eynna_custom_properties' );

/**
 * Body classes used by the stylesheet.
 *
 * @param array $classes Existing body classes.
 * @return array
 */
function eynna_body_classes( $classes ) {
	if ( ! is_active_sidebar( 'sidebar-1' ) ) {
		$classes[] = 'no-sidebar';
	}
	if ( eynna_has_hero() ) {
		$classes[] = 'has-cinematic-hero';
	}
	return $classes;
}
add_filter( 'body_class', 'eynna_body_classes' );

/**
 * Nicer excerpt ending.
 *
 * @return string
 */
function eynna_excerpt_more() {
	return '&hellip;';
}
add_filter( 'excerpt_more', 'eynna_excerpt_more' );

require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/customizer.php';

if ( class_exists( 'WooCommerce' ) ) {
	require_once get_template_directory() . '/inc/woocommerce.php';
}
