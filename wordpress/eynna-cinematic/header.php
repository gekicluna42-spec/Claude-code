<?php
/**
 * Site header.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<link rel="profile" href="https://gmpg.org/xfn/11" />
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div class="grain" aria-hidden="true"></div>

<a class="skip-link screen-reader-text" href="#primary"><?php esc_html_e( 'Preskoči na sadržaj', 'eynna-cinematic' ); ?></a>

<div id="page" class="site">

	<header id="masthead" class="nav" role="banner">
		<div class="nav__brand">
			<?php
			if ( has_custom_logo() ) {
				the_custom_logo();
			} else {
				printf(
					'<a class="nav__brand-link" href="%1$s" rel="home">%2$s</a>',
					esc_url( home_url( '/' ) ),
					esc_html( get_bloginfo( 'name' ) )
				);
			}
			?>
		</div>

		<nav class="nav__links" role="navigation" aria-label="<?php esc_attr_e( 'Glavni meni', 'eynna-cinematic' ); ?>">
			<?php
			if ( has_nav_menu( 'primary' ) ) {
				wp_nav_menu(
					array(
						'theme_location' => 'primary',
						'container'      => false,
						'menu_class'     => 'nav__menu',
						'depth'          => 2,
					)
				);
			} else {
				// No menu assigned yet: still show navigation so nothing becomes
				// unreachable the moment the theme is activated.
				wp_page_menu(
					array(
						'menu_class'  => 'nav__menu',
						'show_home'   => true,
						'container'   => 'ul',
					)
				);
			}
			?>
		</nav>

		<div class="nav__actions">
			<?php if ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_cart_url' ) ) : ?>
				<a class="nav__cart" href="<?php echo esc_url( wc_get_cart_url() ); ?>">
					<?php esc_html_e( 'Korpa', 'eynna-cinematic' ); ?>
					<span class="cart-count" id="eynna-cart-count"><?php echo esc_html( (string) eynna_cart_count() ); ?></span>
				</a>
			<?php endif; ?>
			<button class="nav__toggle" id="eynna-nav-toggle" aria-expanded="false" aria-controls="masthead">
				<span class="screen-reader-text"><?php esc_html_e( 'Otvori meni', 'eynna-cinematic' ); ?></span>
				<span class="nav__toggle-bar" aria-hidden="true"></span>
			</button>
		</div>
	</header>
