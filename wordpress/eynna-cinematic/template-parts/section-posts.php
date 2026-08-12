<?php
/**
 * Latest guides from the blog.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$eynna_posts = get_posts(
	array(
		'numberposts'      => 3,
		'post_status'      => 'publish',
		'suppress_filters' => false,
	)
);

if ( empty( $eynna_posts ) ) {
	return;
}
?>
<section class="guides" id="vodici">
	<?php eynna_section_head( __( 'Vodiči', 'eynna-cinematic' ), __( 'Savjeti za <em>njegu i odabir.</em>', 'eynna-cinematic' ), true ); ?>

	<div class="post-grid post-grid--3">
		<?php
		foreach ( $eynna_posts as $eynna_post ) :
			setup_postdata( $GLOBALS['post'] = $eynna_post ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			get_template_part( 'template-parts/content' );
		endforeach;
		wp_reset_postdata();
		?>
	</div>
</section>
