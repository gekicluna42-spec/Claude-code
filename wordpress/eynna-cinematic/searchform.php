<?php
/**
 * Search form.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="eynna-search-field"><?php esc_html_e( 'Pretraga', 'eynna-cinematic' ); ?></label>
	<input type="search" id="eynna-search-field" class="search-field" placeholder="<?php esc_attr_e( 'Pretraži…', 'eynna-cinematic' ); ?>" value="<?php echo esc_attr( get_search_query() ); ?>" name="s" />
	<button type="submit" class="search-submit"><?php esc_html_e( 'Traži', 'eynna-cinematic' ); ?></button>
</form>
