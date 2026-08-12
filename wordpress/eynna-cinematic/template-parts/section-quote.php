<?php
/**
 * Pull quote.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$eynna_quote = eynna_mod( 'eynna_quote_text' );
$eynna_by    = wp_strip_all_tags( eynna_mod( 'eynna_quote_by' ) );

if ( '' === wp_strip_all_tags( $eynna_quote ) ) {
	return;
}
?>
<section class="quote">
	<blockquote class="quote__text reveal">
		<?php echo wp_kses( $eynna_quote, array( 'em' => array(), 'br' => array() ) ); ?>
	</blockquote>
	<?php if ( $eynna_by ) : ?>
		<p class="quote__by reveal">&mdash; <?php echo esc_html( $eynna_by ); ?></p>
	<?php endif; ?>
</section>
