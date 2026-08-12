<?php
/**
 * 404 page.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>

<div class="site-content">
	<main id="primary" class="site-main error-404">
		<h1 class="page-title"><?php esc_html_e( 'Stranica nije pronađena', 'eynna-cinematic' ); ?></h1>
		<p><?php esc_html_e( 'Izgleda da na ovoj adresi nema ničega. Pokušajte pretragom.', 'eynna-cinematic' ); ?></p>
		<?php get_search_form(); ?>
		<p><a class="btn btn--gold" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Nazad na naslovnicu', 'eynna-cinematic' ); ?></a></p>
	</main>
</div>

<?php
get_footer();
