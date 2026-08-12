<?php
/**
 * Search result item.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<article id="post-<?php the_ID(); ?>" <?php post_class( 'post-card reveal' ); ?>>
	<?php eynna_post_thumbnail( 'medium' ); ?>
	<div class="post-card__body">
		<?php the_title( '<h2 class="post-card__title"><a href="' . esc_url( get_permalink() ) . '">', '</a></h2>' ); ?>
		<div class="post-card__excerpt"><?php the_excerpt(); ?></div>
	</div>
</article>
