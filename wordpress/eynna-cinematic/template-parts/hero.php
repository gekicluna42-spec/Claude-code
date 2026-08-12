<?php
/**
 * Cinematic hero.
 *
 * Three tiers, decided at runtime by assets/js/eynna-hero.js:
 *   1. a video is set in the Customizer  → scroll-scrubbed video
 *   2. no video                          → canvas strand animation
 *   3. reduced motion, or narrow screen  → static poster
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$eynna_video  = eynna_get_hero_video_url();
$eynna_poster = eynna_get_hero_poster_url();

$eynna_cta1_url = get_theme_mod( 'eynna_hero_cta1_url', '' );
$eynna_cta2_url = get_theme_mod( 'eynna_hero_cta2_url', '' );

if ( ! $eynna_cta1_url ) {
	$eynna_cta1_url = ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_page_permalink' ) )
		? wc_get_page_permalink( 'shop' )
		: '#kolekcija';
}
if ( ! $eynna_cta2_url ) {
	$eynna_cta2_url = '#kontakt';
}

$eynna_allowed = array( 'em' => array(), 'br' => array(), 'strong' => array() );
?>
<section class="hero" id="hero"
	data-video="<?php echo esc_url( $eynna_video ); ?>"
	data-poster="<?php echo esc_url( $eynna_poster ); ?>">

	<div class="hero__media" aria-hidden="true">
		<?php if ( $eynna_video ) : ?>
			<video class="hero__video" id="eynna-hero-video"
				muted playsinline preload="auto"
				<?php if ( $eynna_poster ) : ?>poster="<?php echo esc_url( $eynna_poster ); ?>"<?php endif; ?>
				src="<?php echo esc_url( $eynna_video ); ?>"></video>
		<?php else : ?>
			<?php // 3D field first; the 2D canvas is the fallback if WebGL2 is unavailable. ?>
			<canvas class="hero__gl" id="eynna-hero-gl"></canvas>
			<canvas class="hero__canvas" id="eynna-hero-canvas"></canvas>
		<?php endif; ?>

		<?php if ( $eynna_poster ) : ?>
			<img class="hero__poster" id="eynna-hero-poster" src="<?php echo esc_url( $eynna_poster ); ?>" alt="" loading="eager" decoding="async" />
		<?php endif; ?>
	</div>

	<div class="hero__vignette" aria-hidden="true"></div>

	<div class="hero__content">
		<p class="hero__eyebrow"><?php echo esc_html( wp_strip_all_tags( eynna_mod( 'eynna_hero_eyebrow' ) ) ); ?></p>

		<h1 class="hero__title">
			<span class="hero__line"><?php echo wp_kses( eynna_mod( 'eynna_hero_title_1' ), $eynna_allowed ); ?></span>
			<span class="hero__line"><?php echo wp_kses( eynna_mod( 'eynna_hero_title_2' ), $eynna_allowed ); ?></span>
		</h1>

		<p class="hero__sub"><?php echo esc_html( wp_strip_all_tags( eynna_mod( 'eynna_hero_sub' ) ) ); ?></p>

		<div class="hero__actions">
			<a class="btn btn--gold" href="<?php echo esc_url( $eynna_cta1_url ); ?>">
				<?php echo esc_html( wp_strip_all_tags( eynna_mod( 'eynna_hero_cta1_text' ) ) ); ?>
			</a>
			<a class="btn btn--ghost" href="<?php echo esc_url( $eynna_cta2_url ); ?>">
				<?php echo esc_html( wp_strip_all_tags( eynna_mod( 'eynna_hero_cta2_text' ) ) ); ?>
			</a>
		</div>
	</div>

	<div class="hero__scrollhint" aria-hidden="true">
		<span><?php esc_html_e( 'Skrolaj', 'eynna-cinematic' ); ?></span>
		<i class="hero__scrollline"></i>
	</div>
</section>
