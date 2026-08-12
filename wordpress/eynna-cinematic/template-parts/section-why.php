<?php
/**
 * Trust cards. All copy is Customizer-editable.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$eynna_icons = array( '&#10022;', '&#9829;', '&#10148;', '&#9993;' );
?>
<section class="why" id="zasto">
	<?php eynna_section_head( __( '03 / Zašto Eynna', 'eynna-cinematic' ), __( 'Više od kose —<br /><em>samopouzdanje.</em>', 'eynna-cinematic' ), true ); ?>

	<div class="why__grid">
		<?php for ( $eynna_i = 1; $eynna_i <= 4; $eynna_i++ ) : ?>
			<?php
			$eynna_title = wp_strip_all_tags( eynna_mod( "eynna_why_{$eynna_i}_title" ) );
			$eynna_text  = wp_strip_all_tags( eynna_mod( "eynna_why_{$eynna_i}_text" ) );

			if ( '' === $eynna_title && '' === $eynna_text ) {
				continue;
			}
			?>
			<div class="why__card reveal<?php echo 2 === $eynna_i ? ' why__card--accent' : ''; ?>">
				<div class="why__icon" aria-hidden="true"><?php echo wp_kses_post( $eynna_icons[ $eynna_i - 1 ] ); ?></div>
				<h3><?php echo esc_html( $eynna_title ); ?></h3>
				<p><?php echo esc_html( $eynna_text ); ?></p>
			</div>
		<?php endfor; ?>
	</div>
</section>
