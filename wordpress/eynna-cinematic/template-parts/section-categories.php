<?php
/**
 * Collection grid.
 *
 * Pulls real WooCommerce product categories. Falls back to CSS-art cards with
 * the brand's four categories when WooCommerce is not active, so the section
 * never renders empty.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Shades drive the CSS-art placeholder gradient on cards without a thumbnail.
$eynna_shades = array(
	array( '#1c1512', '#4a3323', '#8a5a33' ),
	array( '#241a11', '#6b4a26', '#c99a56' ),
	array( '#2b1c10', '#8a5a2a', '#e3b878' ),
	array( '#181310', '#5a4636', '#a8876a' ),
);

$eynna_cards = array();

if ( taxonomy_exists( 'product_cat' ) ) {
	$eynna_terms = get_terms(
		array(
			'taxonomy'   => 'product_cat',
			'hide_empty' => true,
			'number'     => 4,
			'orderby'    => 'menu_order',
			'exclude'    => array( get_option( 'default_product_cat' ) ),
		)
	);

	if ( ! is_wp_error( $eynna_terms ) && ! empty( $eynna_terms ) ) {
		foreach ( $eynna_terms as $eynna_term ) {
			$eynna_thumb_id = get_term_meta( $eynna_term->term_id, 'thumbnail_id', true );

			$eynna_cards[] = array(
				'name'  => $eynna_term->name,
				'desc'  => wp_strip_all_tags( term_description( $eynna_term ) ),
				'url'   => get_term_link( $eynna_term ),
				'image' => $eynna_thumb_id ? wp_get_attachment_image_url( $eynna_thumb_id, 'large' ) : '',
				/* translators: %d: number of products in the category. */
				'tag'   => sprintf( _n( '%d proizvod', '%d proizvoda', (int) $eynna_term->count, 'eynna-cinematic' ), (int) $eynna_term->count ),
			);
		}
	}
}

// Fallback: the brand's four categories, no WooCommerce required.
if ( empty( $eynna_cards ) ) {
	$eynna_cards = array(
		array(
			'name' => __( 'Perike', 'eynna-cinematic' ),
			'desc' => __( 'Od prirodne ljudske kose i premium vlakana — potpuna transformacija koja se ne primjećuje.', 'eynna-cinematic' ),
			'url'  => '',
			'image' => '',
			'tag'  => __( 'Prirodan izgled', 'eynna-cinematic' ),
		),
		array(
			'name' => __( 'Ekstenzije', 'eynna-cinematic' ),
			'desc' => __( 'Dužina i volumen bez čekanja — nadogradnja koja se savršeno stapa s vašom kosom.', 'eynna-cinematic' ),
			'url'  => '',
			'image' => '',
			'tag'  => __( 'Volumen i dužina', 'eynna-cinematic' ),
		),
		array(
			'name' => __( 'Repovi', 'eynna-cinematic' ),
			'desc' => __( 'Elegantan rep za svaku priliku — pričvršćuje se za nekoliko sekundi, izgleda kao vaš.', 'eynna-cinematic' ),
			'url'  => '',
			'image' => '',
			'tag'  => __( 'Brza promjena', 'eynna-cinematic' ),
		),
		array(
			'name' => __( 'Topperi', 'eynna-cinematic' ),
			'desc' => __( 'Diskretno pokrivaju prorijeđenu kosu na tjemenu i vraćaju punoću tamo gdje treba.', 'eynna-cinematic' ),
			'url'  => '',
			'image' => '',
			'tag'  => __( 'Diskretno rješenje', 'eynna-cinematic' ),
		),
	);
}
?>
<section class="collection" id="kolekcija">
	<?php eynna_section_head( __( '01 / Kolekcija', 'eynna-cinematic' ), __( 'Četiri načina do<br /><em>savršene kose.</em>', 'eynna-cinematic' ) ); ?>

	<div class="collection__grid">
		<?php
		foreach ( $eynna_cards as $eynna_i => $eynna_card ) :
			$eynna_shade = $eynna_shades[ $eynna_i % count( $eynna_shades ) ];
			$eynna_style = sprintf(
				'--shade1:%1$s;--shade2:%2$s;--shade3:%3$s',
				$eynna_shade[0],
				$eynna_shade[1],
				$eynna_shade[2]
			);
			$eynna_url   = is_string( $eynna_card['url'] ) && $eynna_card['url'] ? $eynna_card['url'] : '';
			?>
			<article class="ccard reveal" style="<?php echo esc_attr( $eynna_style ); ?>">
				<div class="ccard__media">
					<?php if ( $eynna_card['image'] ) : ?>
						<img class="ccard__img" src="<?php echo esc_url( $eynna_card['image'] ); ?>" alt="<?php echo esc_attr( $eynna_card['name'] ); ?>" loading="lazy" decoding="async" />
					<?php else : ?>
						<div class="ccard__hair" aria-hidden="true"></div>
					<?php endif; ?>
					<span class="ccard__tag"><?php echo esc_html( $eynna_card['tag'] ); ?></span>
				</div>

				<div class="ccard__body">
					<h3 class="ccard__name"><?php echo esc_html( $eynna_card['name'] ); ?></h3>

					<?php if ( $eynna_card['desc'] ) : ?>
						<p class="ccard__desc"><?php echo esc_html( wp_trim_words( $eynna_card['desc'], 22 ) ); ?></p>
					<?php endif; ?>

					<?php if ( $eynna_url ) : ?>
						<a class="ccard__link" href="<?php echo esc_url( $eynna_url ); ?>">
							<?php esc_html_e( 'Pogledaj', 'eynna-cinematic' ); ?><span>&rarr;</span>
						</a>
					<?php endif; ?>
				</div>
			</article>
		<?php endforeach; ?>
	</div>
</section>
