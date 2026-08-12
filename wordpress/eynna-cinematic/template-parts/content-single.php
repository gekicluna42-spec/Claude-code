<?php
/**
 * Single post content.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'entry entry--single' ); ?>>
	<header class="entry-header">
		<?php the_title( '<h1 class="entry-title">', '</h1>' ); ?>
		<?php eynna_post_meta(); ?>
	</header>

	<?php eynna_post_thumbnail( 'large' ); ?>

	<div class="entry-content">
		<?php
		the_content();

		wp_link_pages(
			array(
				'before' => '<div class="page-links">' . esc_html__( 'Stranice:', 'eynna-cinematic' ),
				'after'  => '</div>',
			)
		);
		?>
	</div>

	<?php if ( has_tag() ) : ?>
		<footer class="entry-footer">
			<?php the_tags( '<span class="tags-links">', ' ', '</span>' ); ?>
		</footer>
	<?php endif; ?>
</article>
