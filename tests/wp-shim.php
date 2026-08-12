<?php
/**
 * Minimal WordPress function shim.
 *
 * Enough of the WordPress and WooCommerce API to render this theme's templates
 * outside a real WordPress install, so template bugs (fatals, typo'd function
 * names, wrong arg counts, unescaped output) surface in CI where booting
 * WordPress is not possible.
 *
 * Not a WordPress emulator — it only covers the surface this theme touches.
 */

error_reporting( E_ALL );

// Any notice, warning or deprecation becomes a hard failure.
set_error_handler(
	function ( $severity, $message, $file, $line ) {
		throw new ErrorException( $message, 0, $severity, $file, $line );
	}
);

define( 'ABSPATH', __DIR__ . '/' );
define( 'DATE_W3C_FALLBACK', 'Y-m-d\TH:i:sP' );

$GLOBALS['eynna_theme_dir'] = dirname( __DIR__ ) . '/wordpress/eynna-cinematic';
$GLOBALS['eynna_actions']   = array();
$GLOBALS['eynna_mods']      = array();

/* ---------------------------------------------------------------------------
 * Fixtures
 * ------------------------------------------------------------------------- */

class Eynna_Fake_Post {
	public $ID;
	public $post_title;
	public $post_content;
	public $post_excerpt;
	public $post_date;

	public function __construct( $id, $title, $content ) {
		$this->ID           = $id;
		$this->post_title   = $title;
		$this->post_content = $content;
		$this->post_excerpt = mb_substr( strip_tags( $content ), 0, 120 ) . '…';
		$this->post_date    = '2026-03-0' . $id . ' 10:00:00';
	}
}

$GLOBALS['eynna_posts'] = array(
	new Eynna_Fake_Post( 1, 'Kako odabrati periku od prirodne kose', '<p>Vodič kroz nijanse, dužine i tipove baze. Prirodna kosa se može farbati i oblikovati kao vlastita.</p>' ),
	new Eynna_Fake_Post( 2, 'Njega ekstenzija: sedam pravila', '<p>Pranje, sušenje i čuvanje. Uz pravilnu njegu ekstenzije traju znatno duže.</p>' ),
	new Eynna_Fake_Post( 3, 'Topperi — diskretno rješenje za tjeme', '<p>Kada topper ima smisla i kako odabrati veličinu baze.</p>' ),
);

$GLOBALS['eynna_loop_index'] = -1;
$GLOBALS['eynna_loop_posts'] = array();
$GLOBALS['post']             = null;

/**
 * Point the loop at a set of posts.
 *
 * @param array $posts Posts to iterate.
 */
function eynna_shim_set_loop( array $posts ) {
	$GLOBALS['eynna_loop_posts'] = $posts;
	$GLOBALS['eynna_loop_index'] = -1;
}

/* ---------------------------------------------------------------------------
 * Context flags, overridable per render
 * ------------------------------------------------------------------------- */

$GLOBALS['eynna_ctx'] = array(
	'is_home'          => false,
	'is_front_page'    => false,
	'is_singular'      => true,
	'is_page_template' => false,
	'has_woo'          => false,
	'has_sidebar'      => false,
	'hero_video'       => '',
	'hero_poster'      => '',
);

/**
 * Read a context flag.
 *
 * @param string $key Flag name.
 * @return mixed
 */
function eynna_ctx( $key ) {
	return isset( $GLOBALS['eynna_ctx'][ $key ] ) ? $GLOBALS['eynna_ctx'][ $key ] : false;
}

/* ---------------------------------------------------------------------------
 * i18n
 * ------------------------------------------------------------------------- */

function __( $t, $d = null ) { return $t; }
function esc_html__( $t, $d = null ) { return htmlspecialchars( $t, ENT_QUOTES, 'UTF-8' ); }
function esc_html_e( $t, $d = null ) { echo esc_html__( $t ); }
function esc_attr_e( $t, $d = null ) { echo htmlspecialchars( $t, ENT_QUOTES, 'UTF-8' ); }
function _n( $s, $p, $n, $d = null ) { return 1 === (int) $n ? $s : $p; }
function number_format_i18n( $n ) { return (string) $n; }
function load_theme_textdomain( $d, $p = '' ) { return true; }

/* ---------------------------------------------------------------------------
 * Escaping
 * ------------------------------------------------------------------------- */

function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
function esc_url( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES, 'UTF-8' ); }
function esc_url_raw( $u ) { return (string) $u; }
function esc_textarea( $t ) { return esc_html( $t ); }
function wp_kses( $s, $allowed = array() ) { return $s; }
function wp_kses_post( $s ) { return $s; }
function wp_strip_all_tags( $s ) { return strip_tags( (string) $s ); }
function sanitize_hex_color( $c ) { return preg_match( '/^#[a-f0-9]{6}$/i', (string) $c ) ? $c : null; }
function wp_trim_words( $text, $num = 55, $more = '…' ) {
	$words = preg_split( '/\s+/', strip_tags( (string) $text ), -1, PREG_SPLIT_NO_EMPTY );
	return count( $words ) > $num ? implode( ' ', array_slice( $words, 0, $num ) ) . $more : implode( ' ', $words );
}

/* ---------------------------------------------------------------------------
 * Hooks
 * ------------------------------------------------------------------------- */

function add_action( $hook, $cb, $priority = 10, $args = 1 ) {
	$GLOBALS['eynna_actions'][ $hook ][] = $cb;
}
function add_filter( $hook, $cb, $priority = 10, $args = 1 ) {
	$GLOBALS['eynna_actions'][ $hook ][] = $cb;
}
function remove_action( $hook, $cb, $priority = 10 ) { return true; }
function remove_filter( $hook, $cb, $priority = 10 ) { return true; }
function do_action( $hook ) {
	if ( empty( $GLOBALS['eynna_actions'][ $hook ] ) ) {
		return;
	}
	foreach ( $GLOBALS['eynna_actions'][ $hook ] as $cb ) {
		if ( is_callable( $cb ) ) {
			call_user_func( $cb );
		}
	}
}
function add_theme_support() { return true; }
function register_nav_menus( $m ) { return true; }
function register_sidebar( $a ) { return true; }

/* ---------------------------------------------------------------------------
 * Theme paths and assets
 * ------------------------------------------------------------------------- */

function get_template_directory() { return $GLOBALS['eynna_theme_dir']; }
function get_template_directory_uri() { return '.'; }
function get_stylesheet_uri() { return './style.css'; }
function get_theme_mod( $k, $default = false ) {
	if ( 'eynna_hero_video' === $k ) { return eynna_ctx( 'hero_video' ); }
	if ( 'eynna_hero_poster' === $k ) { return eynna_ctx( 'hero_poster' ); }
	return isset( $GLOBALS['eynna_mods'][ $k ] ) ? $GLOBALS['eynna_mods'][ $k ] : $default;
}
function get_option( $k, $default = false ) { return $default; }

$GLOBALS['eynna_styles']  = array();
$GLOBALS['eynna_scripts'] = array();

function wp_enqueue_style( $h, $src = '', $deps = array(), $ver = '' ) {
	if ( $src ) { $GLOBALS['eynna_styles'][ $h ] = $src; }
}
function wp_enqueue_script( $h, $src = '', $deps = array(), $ver = '', $footer = false ) {
	if ( $src ) { $GLOBALS['eynna_scripts'][ $h ] = $src; }
}
function wp_localize_script( $h, $obj, $data ) {
	$GLOBALS['eynna_localized'][ $obj ] = $data;
}

function wp_head() {
	foreach ( $GLOBALS['eynna_styles'] as $handle => $src ) {
		printf( '<link rel="stylesheet" id="%s" href="%s" />' . "\n", esc_attr( $handle ), esc_url( $src ) );
	}
	do_action( 'wp_head' );
}

function wp_footer() {
	if ( ! empty( $GLOBALS['eynna_localized'] ) ) {
		foreach ( $GLOBALS['eynna_localized'] as $obj => $data ) {
			printf( '<script>var %s = %s;</script>' . "\n", $obj, json_encode( $data ) );
		}
	}
	foreach ( $GLOBALS['eynna_scripts'] as $handle => $src ) {
		printf( '<script src="%s" id="%s"></script>' . "\n", esc_url( $src ), esc_attr( $handle ) );
	}
}

function wp_body_open() {}

/* ---------------------------------------------------------------------------
 * Template loading
 * ------------------------------------------------------------------------- */

function get_header( $name = null ) { include get_template_directory() . '/header.php'; }
function get_footer( $name = null ) { include get_template_directory() . '/footer.php'; }
function get_sidebar( $name = null ) { include get_template_directory() . '/sidebar.php'; }
function get_search_form() { include get_template_directory() . '/searchform.php'; }
function comments_template( $f = '', $s = false ) { include get_template_directory() . '/comments.php'; }

function get_template_part( $slug, $name = null ) {
	$base = get_template_directory() . '/' . $slug;
	$candidates = array();
	if ( $name ) { $candidates[] = "{$base}-{$name}.php"; }
	$candidates[] = "{$base}.php";

	foreach ( $candidates as $file ) {
		if ( file_exists( $file ) ) {
			include $file;
			return;
		}
	}
}

/* ---------------------------------------------------------------------------
 * Conditionals
 * ------------------------------------------------------------------------- */

function is_home() { return (bool) eynna_ctx( 'is_home' ); }
function is_front_page() { return (bool) eynna_ctx( 'is_front_page' ); }
function is_singular( $t = '' ) { return (bool) eynna_ctx( 'is_singular' ); }
function is_page_template( $t = '' ) { return eynna_ctx( 'is_page_template' ) === $t; }
function is_attachment() { return false; }
function is_active_sidebar( $id ) { return 'sidebar-1' === $id ? (bool) eynna_ctx( 'has_sidebar' ) : false; }
function is_wp_error( $t ) { return $t instanceof WP_Error; }
function has_nav_menu( $l ) { return true; }
function has_custom_logo() { return false; }
function has_post_thumbnail() { return false; }
function has_tag() { return false; }
function post_password_required() { return false; }
function comments_open() { return false; }
function get_comments_number() { return 0; }
function have_comments() { return false; }
function post_type_supports( $t, $f ) { return true; }
function taxonomy_exists( $t ) { return (bool) eynna_ctx( 'has_woo' ); }
function class_exists_woo() { return (bool) eynna_ctx( 'has_woo' ); }

class WP_Error {}

/* ---------------------------------------------------------------------------
 * The loop
 * ------------------------------------------------------------------------- */

function have_posts() {
	return ( $GLOBALS['eynna_loop_index'] + 1 ) < count( $GLOBALS['eynna_loop_posts'] );
}

function the_post() {
	$GLOBALS['eynna_loop_index']++;
	$GLOBALS['post'] = $GLOBALS['eynna_loop_posts'][ $GLOBALS['eynna_loop_index'] ];
}

function setup_postdata( $p ) { $GLOBALS['post'] = $p; return true; }
function wp_reset_postdata() { return true; }

function get_posts( $args = array() ) {
	$n = isset( $args['numberposts'] ) ? (int) $args['numberposts'] : 3;
	return array_slice( $GLOBALS['eynna_posts'], 0, $n );
}

function the_ID() { echo (int) $GLOBALS['post']->ID; }
function get_the_ID() { return (int) $GLOBALS['post']->ID; }
function get_the_title() { return $GLOBALS['post']->post_title; }
function the_title( $before = '', $after = '' ) { echo $before . esc_html( get_the_title() ) . $after; }
function single_post_title( $prefix = '', $display = true ) {
	$t = 'Blog';
	if ( $display ) { echo esc_html( $prefix . $t ); }
	return $t;
}
function get_the_content() { return $GLOBALS['post']->post_content; }
function the_content() { echo $GLOBALS['post']->post_content; }
function the_excerpt() { echo '<p>' . esc_html( $GLOBALS['post']->post_excerpt ) . '</p>'; }
function get_permalink( $id = 0 ) { return '#post-' . ( $id ? $id : get_the_ID() ); }
function the_permalink() { echo esc_url( get_permalink() ); }
function get_post_type() { return 'post'; }
function get_the_date( $format = '' ) {
	$ts = strtotime( $GLOBALS['post']->post_date );
	return 'Y-m-d\TH:i:sP' === $format || DATE_W3C === $format ? date( 'Y-m-d\TH:i:sP', $ts ) : date( 'j.n.Y.', $ts );
}
function get_the_category_list( $sep = '' ) { return '<a href="#kategorija">Vodiči</a>'; }
function post_class( $class = '' ) {
	echo 'class="' . esc_attr( 'post ' . ( is_array( $class ) ? implode( ' ', $class ) : $class ) ) . '"';
}
function body_class( $class = '' ) {
	$classes = array( 'wordpress' );
	if ( is_array( $class ) ) { $classes = array_merge( $classes, $class ); } elseif ( $class ) { $classes[] = $class; }
	if ( ! empty( $GLOBALS['eynna_actions']['body_class_filter'] ) ) { $classes[] = 'filtered'; }
	if ( function_exists( 'eynna_body_classes' ) ) { $classes = eynna_body_classes( $classes ); }
	echo 'class="' . esc_attr( implode( ' ', $classes ) ) . '"';
}
function the_post_thumbnail( $size = '' ) {}
function wp_link_pages( $a = array() ) {}
function the_tags( $b = '', $s = '', $a = '' ) {}
function the_archive_title( $b = '', $a = '' ) { echo $b . 'Arhiva' . $a; }
function the_archive_description( $b = '', $a = '' ) {}
function the_posts_pagination( $a = array() ) { echo '<nav class="pagination"></nav>'; }
function the_post_navigation( $a = array() ) { echo '<nav class="post-navigation"></nav>'; }
function the_comments_navigation( $a = array() ) {}
function wp_list_comments( $a = array() ) {}
function comment_form( $a = array() ) { echo '<form class="comment-form"></form>'; }
function get_search_query() { return 'perika'; }

/* ---------------------------------------------------------------------------
 * Site info, menus, widgets
 * ------------------------------------------------------------------------- */

function home_url( $p = '/' ) { return '#'; }
function get_bloginfo( $s = '' ) { return 'name' === $s ? 'Eynna Hair' : 'UTF-8'; }
function bloginfo( $s = '' ) { echo esc_html( get_bloginfo( $s ) ); }
function language_attributes() { echo 'lang="bs"'; }
function the_custom_logo() {}

function wp_nav_menu( $args = array() ) {
	$items = array( 'Naslovna', 'Shop', 'Kolekcija', 'Materijali', 'Blog', 'Kontakt' );
	$class = isset( $args['menu_class'] ) ? $args['menu_class'] : 'menu';
	echo '<ul class="' . esc_attr( $class ) . '">';
	foreach ( $items as $item ) {
		printf( '<li><a href="#">%s</a></li>', esc_html( $item ) );
	}
	echo '</ul>';
}

function wp_page_menu( $args = array() ) { wp_nav_menu( $args ); }
function dynamic_sidebar( $id ) { echo '<section class="widget"><h4 class="widget-title">Widget</h4><ul><li><a href="#">Stavka</a></li></ul></section>'; return true; }

/* ---------------------------------------------------------------------------
 * Terms and attachments
 * ------------------------------------------------------------------------- */

function get_terms( $args = array() ) {
	if ( ! eynna_ctx( 'has_woo' ) ) {
		return array();
	}
	$names = array( 'Perike od prirodne ljudske kose', 'Ekstenzije', 'Repovi', 'Topperi za kosu' );
	$out   = array();
	foreach ( $names as $i => $n ) {
		$t              = new stdClass();
		$t->term_id     = $i + 1;
		$t->name        = $n;
		$t->count       = 6 + $i;
		$t->slug        = 'kat-' . ( $i + 1 );
		$out[]          = $t;
	}
	return $out;
}

function get_term_meta( $id, $key, $single = false ) { return ''; }
function term_description( $t = 0 ) { return 'Kratak opis kategorije za potrebe testiranja izgleda.'; }
function get_term_link( $t ) { return '#kategorija-' . ( is_object( $t ) ? $t->term_id : $t ); }
function wp_get_attachment_image_url( $id, $size = '' ) { return ''; }

/* ---------------------------------------------------------------------------
 * WooCommerce (only defined when the context asks for it)
 * ------------------------------------------------------------------------- */

if ( ! function_exists( 'eynna_shim_define_woo' ) ) {
	/**
	 * Define the WooCommerce surface the theme touches.
	 */
	function eynna_shim_define_woo() {
		if ( class_exists( 'WooCommerce', false ) ) {
			return;
		}
		eval( '
			class WooCommerce {}
			class Eynna_Fake_Product {
				private $id; private $name; private $price;
				public function __construct( $id, $name, $price ) { $this->id = $id; $this->name = $name; $this->price = $price; }
				public function get_id() { return $this->id; }
				public function get_name() { return $this->name; }
				public function get_price_html() { return $this->price . " KM"; }
				public function get_image( $size = "" ) { return "<img src=\'\' alt=\'\' />"; }
			}
			function wc_get_products( $args = array() ) {
				$names = array( "Perika Amara", "Perika Selma", "Rep Lana", "Topper Ivy", "Ekstenzije 55cm", "Perika Nora" );
				$out = array();
				foreach ( $names as $i => $n ) { $out[] = new Eynna_Fake_Product( 100 + $i, $n, 690 + $i * 110 ); }
				return array_slice( $out, 0, isset( $args["limit"] ) ? (int) $args["limit"] : 6 );
			}
			function wc_get_cart_url() { return "#korpa"; }
			function wc_get_page_permalink( $p ) { return "#shop"; }
		' );
	}
}
