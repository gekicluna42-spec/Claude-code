<?php
/**
 * Empty state.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<section class="no-results">
	<h2><?php esc_html_e( 'Ništa nije pronađeno', 'eynna-cinematic' ); ?></h2>
	<p><?php esc_html_e( 'Pokušajte s drugim pojmom.', 'eynna-cinematic' ); ?></p>
	<?php get_search_form(); ?>
</section>
