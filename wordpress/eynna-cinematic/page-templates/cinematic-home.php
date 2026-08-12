<?php
/**
 * Template Name: Kinematska naslovnica
 * Template Post Type: page
 *
 * Opt-in homepage. Assign it to a page from the page editor's Template box.
 * Nothing changes on the site until you do — the theme ships no front-page.php,
 * so an existing static front page keeps rendering its own content.
 *
 * Any content written in the page editor renders below the cinematic sections,
 * so assigning this template never hides existing content.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();

get_template_part( 'template-parts/hero' );

eynna_marquee();

get_template_part( 'template-parts/section-categories' );
get_template_part( 'template-parts/section-products' );
get_template_part( 'template-parts/section-materials' );
get_template_part( 'template-parts/section-why' );
get_template_part( 'template-parts/section-quote' );
get_template_part( 'template-parts/section-posts' );

// Whatever the editor holds for this page still renders, below the sections.
while ( have_posts() ) :
	the_post();

	$eynna_content = trim( get_the_content() );
	if ( '' === $eynna_content ) {
		continue;
	}
	?>
	<div class="site-content">
		<main id="primary" class="site-main">
			<div class="entry-content">
				<?php the_content(); ?>
			</div>
		</main>
	</div>
	<?php
endwhile;
?>

<section class="contact" id="kontakt">
	<div class="contact__inner reveal">
		<p class="section-head__index"><?php esc_html_e( '04 / Kontakt', 'eynna-cinematic' ); ?></p>
		<h2 class="section-head__title">
			<?php
			echo wp_kses(
				__( 'Niste sigurni<br /><em>šta odabrati?</em>', 'eynna-cinematic' ),
				array( 'em' => array(), 'br' => array() )
			);
			?>
		</h2>
		<p class="contact__sub">
			<?php esc_html_e( 'Javite nam se — pomoći ćemo vam pronaći model koji izgleda kao da je oduvijek vaš.', 'eynna-cinematic' ); ?>
		</p>
		<?php eynna_social_links(); ?>
	</div>
</section>

<?php
get_footer();
