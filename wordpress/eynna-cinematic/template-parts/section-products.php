<?php
/**
 * Featured products strip. Renders nothing without WooCommerce.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'wc_get_products' ) ) {
	return;
}

$eynna_products = wc_get_products(
	array(
		'limit'    => 6,
		'status'   => 'publish',
		'featured' => true,
		'orderby'  => 'date',
		'order'    => 'DESC',
	)
);

// No featured products flagged? Fall back to the newest ones.
if ( empty( $eynna_products ) ) {
	$eynna_products = wc_get_products(
		array(
			'limit'   => 6,
			'status'  => 'publish',
			'orderby' => 'date',
			'order'   => 'DESC',
		)
	);
}

if ( empty( $eynna_products ) ) {
	return;
}
?>
<section class="featured" id="izdvojeno">
	<?php eynna_section_head( __( 'Izdvojeno', 'eynna-cinematic' ), __( 'Novo u <em>ponudi.</em>', 'eynna-cinematic' ), true ); ?>

	<div class="featured__grid">
		<?php foreach ( $eynna_products as $eynna_product ) : ?>
			<article class="pcard reveal">
				<a class="pcard__link" href="<?php echo esc_url( get_permalink( $eynna_product->get_id() ) ); ?>">
					<div class="pcard__media">
						<?php
						$eynna_img = $eynna_product->get_image( 'woocommerce_thumbnail' );
						if ( $eynna_img ) {
							echo wp_kses_post( $eynna_img );
						}
						?>
					</div>
					<h3 class="pcard__name"><?php echo esc_html( $eynna_product->get_name() ); ?></h3>
					<div class="pcard__price"><?php echo wp_kses_post( $eynna_product->get_price_html() ); ?></div>
				</a>
			</article>
		<?php endforeach; ?>
	</div>
</section>
