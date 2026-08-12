<?php
/**
 * Materials section.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$eynna_materials = array(
	array(
		'title' => __( 'Prirodna ljudska kosa', 'eynna-cinematic' ),
		'text'  => __( 'Može se oblikovati, feniranjem i peglom, i njegovati kao vlastita kosa.', 'eynna-cinematic' ),
	),
	array(
		'title' => __( 'Futura vlakna', 'eynna-cinematic' ),
		'text'  => __( 'Premium vlakna otporna na toplotu — zadržavaju frizuru i sjaj.', 'eynna-cinematic' ),
	),
	array(
		'title' => __( 'Proteinska vlakna', 'eynna-cinematic' ),
		'text'  => __( 'Mekoća i prirodan sjaj koji se golim okom ne razlikuje od prave kose.', 'eynna-cinematic' ),
	),
	array(
		'title' => __( 'Premium sintetika', 'eynna-cinematic' ),
		'text'  => __( 'Postojan oblik nakon pranja — frizura koja uvijek izgleda uređeno.', 'eynna-cinematic' ),
	),
);
?>
<section class="materials" id="materijali">
	<div class="materials__glow" aria-hidden="true"></div>

	<div class="materials__inner">
		<div class="materials__text reveal">
			<p class="section-head__index"><?php esc_html_e( '02 / Materijali', 'eynna-cinematic' ); ?></p>
			<h2 class="section-head__title">
				<?php
				echo wp_kses(
					__( 'Od vlasišta do vrhova —<br /><em>samo najbolje.</em>', 'eynna-cinematic' ),
					array( 'em' => array(), 'br' => array() )
				);
				?>
			</h2>
			<p class="materials__body">
				<?php esc_html_e( 'Svaki model biramo prema kvaliteti, gustoći i prirodnom padu. Kosa koju nosite treba izgledati, sjajiti i kretati se kao vaša — zato radimo samo s materijalima kojima vjerujemo.', 'eynna-cinematic' ); ?>
			</p>
		</div>

		<ul class="materials__list">
			<?php foreach ( $eynna_materials as $eynna_i => $eynna_m ) : ?>
				<li class="reveal">
					<span><?php echo esc_html( str_pad( (string) ( $eynna_i + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
					<div>
						<h4><?php echo esc_html( $eynna_m['title'] ); ?></h4>
						<p><?php echo esc_html( $eynna_m['text'] ); ?></p>
					</div>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>
</section>
