<?php
/**
 * Template Name: Puna širina (bez bočne trake)
 * Template Post Type: page
 *
 * For page-builder layouts that manage their own width. Outputs the_content()
 * with no wrapper constraints and no sidebar.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>

<div class="site-content site-content--full">
	<main id="primary" class="site-main">
		<?php
		while ( have_posts() ) :
			the_post();
			?>
			<div class="entry-content entry-content--full">
				<?php the_content(); ?>
			</div>
			<?php
		endwhile;
		?>
	</main>
</div>

<?php
get_footer();
