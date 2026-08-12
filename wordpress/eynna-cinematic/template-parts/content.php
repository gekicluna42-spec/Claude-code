<?php
/**
 * Post card used in grids.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'post-card reveal' ); ?>>
	<?php eynna_post_thumbnail( 'medium_large' ); ?>
	<div class="post-card__body">
		<?php eynna_post_meta(); ?>
		<?php the_title( '<h2 class="post-card__title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' ); ?>
		<div class="post-card__excerpt"><?php the_excerpt(); ?></div>
		<a class="post-card__link" href="<?php the_permalink(); ?>">
			<?php esc_html_e( 'Pročitaj', 'eynna-cinematic' ); ?><span>&rarr;</span>
		</a>
	</div>
</article>
