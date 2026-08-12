<?php
/**
 * Customizer options.
 *
 * Every string the cinematic homepage renders is editable here, so the client
 * never has to touch template files.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Defaults, kept in one place so templates and the Customizer agree.
 *
 * @return array<string,string>
 */
function eynna_defaults() {
	return array(
		'eynna_hero_eyebrow'   => __( 'Sarajevo · perike · ekstenzije · repovi · topperi', 'eynna-cinematic' ),
		'eynna_hero_title_1'   => __( '<em>Kosa</em> koja izgleda', 'eynna-cinematic' ),
		'eynna_hero_title_2'   => __( 'kao <em>vaša.</em>', 'eynna-cinematic' ),
		'eynna_hero_sub'       => __( 'Perike, ekstenzije, repovi i topperi od prirodne ljudske kose i premium vlakana — za prirodan izgled, više volumena i diskretna rješenja.', 'eynna-cinematic' ),
		'eynna_hero_cta1_text' => __( 'Pogledaj kolekciju', 'eynna-cinematic' ),
		'eynna_hero_cta2_text' => __( 'Zakaži konsultacije', 'eynna-cinematic' ),
		'eynna_quote_text'     => __( 'Prvi put nakon dugo vremena, pogledala sam se u ogledalo i vidjela — <em>sebe.</em>', 'eynna-cinematic' ),
		'eynna_quote_by'       => __( 'zadovoljna klijentica, Sarajevo', 'eynna-cinematic' ),
		'eynna_why_1_title'    => __( 'Prirodan izgled', 'eynna-cinematic' ),
		'eynna_why_1_text'     => __( 'Modeli birani da se stope s vašom kosom — niko ne mora znati, a svi će primijetiti.', 'eynna-cinematic' ),
		'eynna_why_2_title'    => __( '15% popusta', 'eynna-cinematic' ),
		'eynna_why_2_text'     => __( 'Za osobe sa zdravstvenim gubitkom kose — 15% popusta na modele od prirodne ljudske kose.', 'eynna-cinematic' ),
		'eynna_why_3_title'    => __( 'Dostava u BiH i regiji', 'eynna-cinematic' ),
		'eynna_why_3_text'     => __( 'Brza i diskretno pakovana dostava u BiH, Hrvatsku, Srbiju, Sloveniju i Njemačku.', 'eynna-cinematic' ),
		'eynna_why_4_title'    => __( 'Besplatne konsultacije', 'eynna-cinematic' ),
		'eynna_why_4_text'     => __( 'Pošaljite fotografiju i dobijate preporuku kategorije, dužine i nijanse.', 'eynna-cinematic' ),
	);
}

/**
 * Read a Customizer value, falling back to the shared default.
 *
 * @param string $key Setting key.
 * @return string
 */
function eynna_mod( $key ) {
	$defaults = eynna_defaults();
	$default  = isset( $defaults[ $key ] ) ? $defaults[ $key ] : '';
	return (string) get_theme_mod( $key, $default );
}

/**
 * Allow only inline emphasis in headline fields.
 *
 * @param string $value Raw value.
 * @return string
 */
function eynna_sanitize_headline( $value ) {
	return wp_kses( $value, array( 'em' => array(), 'br' => array(), 'strong' => array() ) );
}

/**
 * Register panels, sections and settings.
 *
 * @param WP_Customize_Manager $wp_customize Customizer instance.
 */
function eynna_customize_register( $wp_customize ) {
	$defaults = eynna_defaults();

	$wp_customize->add_panel(
		'eynna_panel',
		array(
			'title'       => esc_html__( 'Eynna', 'eynna-cinematic' ),
			'description' => esc_html__( 'Postavke kinematske naslovnice i kontakata.', 'eynna-cinematic' ),
			'priority'    => 20,
		)
	);

	/* ---------- Hero ---------- */
	$wp_customize->add_section(
		'eynna_hero',
		array(
			'title'       => esc_html__( 'Hero sekcija', 'eynna-cinematic' ),
			'panel'       => 'eynna_panel',
			'description' => esc_html__( 'Video se koristi samo na stranici sa šablonom "Kinematska naslovnica".', 'eynna-cinematic' ),
		)
	);

	$wp_customize->add_setting(
		'eynna_hero_video',
		array(
			'default'           => '',
			'sanitize_callback' => 'esc_url_raw',
			'transport'         => 'refresh',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Media_Control(
			$wp_customize,
			'eynna_hero_video',
			array(
				'label'       => esc_html__( 'Hero video', 'eynna-cinematic' ),
				'description' => esc_html__( 'MP4 koji se pomjera skrolanjem. Ako je prazno, koristi se animacija u kodu.', 'eynna-cinematic' ),
				'section'     => 'eynna_hero',
				'mime_type'   => 'video',
			)
		)
	);

	$wp_customize->add_setting(
		'eynna_hero_poster',
		array(
			'default'           => '',
			'sanitize_callback' => 'esc_url_raw',
		)
	);
	$wp_customize->add_control(
		new WP_Customize_Media_Control(
			$wp_customize,
			'eynna_hero_poster',
			array(
				'label'       => esc_html__( 'Hero poster slika', 'eynna-cinematic' ),
				'description' => esc_html__( 'Prikazuje se na mobitelu i uz smanjenu animaciju.', 'eynna-cinematic' ),
				'section'     => 'eynna_hero',
				'mime_type'   => 'image',
			)
		)
	);

	$text_fields = array(
		'eynna_hero_eyebrow'   => esc_html__( 'Nadnaslov', 'eynna-cinematic' ),
		'eynna_hero_title_1'   => esc_html__( 'Naslov, prvi red', 'eynna-cinematic' ),
		'eynna_hero_title_2'   => esc_html__( 'Naslov, drugi red', 'eynna-cinematic' ),
		'eynna_hero_sub'       => esc_html__( 'Podnaslov', 'eynna-cinematic' ),
		'eynna_hero_cta1_text' => esc_html__( 'Tekst glavnog dugmeta', 'eynna-cinematic' ),
		'eynna_hero_cta2_text' => esc_html__( 'Tekst drugog dugmeta', 'eynna-cinematic' ),
	);

	foreach ( $text_fields as $key => $label ) {
		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $defaults[ $key ],
				'sanitize_callback' => 'eynna_sanitize_headline',
				'transport'         => 'refresh',
			)
		);
		$wp_customize->add_control(
			$key,
			array(
				'label'   => $label,
				'section' => 'eynna_hero',
				'type'    => in_array( $key, array( 'eynna_hero_sub' ), true ) ? 'textarea' : 'text',
			)
		);
	}

	$link_fields = array(
		'eynna_hero_cta1_url' => esc_html__( 'Link glavnog dugmeta', 'eynna-cinematic' ),
		'eynna_hero_cta2_url' => esc_html__( 'Link drugog dugmeta', 'eynna-cinematic' ),
	);
	foreach ( $link_fields as $key => $label ) {
		$wp_customize->add_setting(
			$key,
			array(
				'default'           => '',
				'sanitize_callback' => 'esc_url_raw',
			)
		);
		$wp_customize->add_control(
			$key,
			array(
				'label'   => $label,
				'section' => 'eynna_hero',
				'type'    => 'url',
			)
		);
	}

	/* ---------- Trust cards ---------- */
	$wp_customize->add_section(
		'eynna_why',
		array(
			'title' => esc_html__( 'Zašto Eynna', 'eynna-cinematic' ),
			'panel' => 'eynna_panel',
		)
	);

	for ( $i = 1; $i <= 4; $i++ ) {
		foreach ( array( 'title', 'text' ) as $part ) {
			$key = "eynna_why_{$i}_{$part}";
			$wp_customize->add_setting(
				$key,
				array(
					'default'           => $defaults[ $key ],
					'sanitize_callback' => 'eynna_sanitize_headline',
				)
			);
			$wp_customize->add_control(
				$key,
				array(
					/* translators: 1: card number, 2: field name. */
					'label'   => sprintf( esc_html__( 'Kartica %1$d — %2$s', 'eynna-cinematic' ), $i, 'title' === $part ? esc_html__( 'naslov', 'eynna-cinematic' ) : esc_html__( 'tekst', 'eynna-cinematic' ) ),
					'section' => 'eynna_why',
					'type'    => 'title' === $part ? 'text' : 'textarea',
				)
			);
		}
	}

	/* ---------- Quote ---------- */
	$wp_customize->add_section(
		'eynna_quote',
		array(
			'title' => esc_html__( 'Citat', 'eynna-cinematic' ),
			'panel' => 'eynna_panel',
		)
	);
	foreach ( array( 'eynna_quote_text' => 'textarea', 'eynna_quote_by' => 'text' ) as $key => $type ) {
		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $defaults[ $key ],
				'sanitize_callback' => 'eynna_sanitize_headline',
			)
		);
		$wp_customize->add_control(
			$key,
			array(
				'label'   => 'eynna_quote_text' === $key ? esc_html__( 'Tekst citata', 'eynna-cinematic' ) : esc_html__( 'Potpis', 'eynna-cinematic' ),
				'section' => 'eynna_quote',
				'type'    => $type,
			)
		);
	}

	/* ---------- Contact ---------- */
	$wp_customize->add_section(
		'eynna_contact',
		array(
			'title' => esc_html__( 'Kontakt i mreže', 'eynna-cinematic' ),
			'panel' => 'eynna_panel',
		)
	);

	$socials = array(
		'eynna_instagram' => array( esc_html__( 'Instagram URL', 'eynna-cinematic' ), 'https://www.instagram.com/eynnahairekstenzije/' ),
		'eynna_facebook'  => array( esc_html__( 'Facebook URL', 'eynna-cinematic' ), 'https://www.facebook.com/eynnahairekstenzije/' ),
		'eynna_youtube'   => array( esc_html__( 'YouTube URL', 'eynna-cinematic' ), 'https://www.youtube.com/@EynnahairSarajevo' ),
	);
	foreach ( $socials as $key => $conf ) {
		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $conf[1],
				'sanitize_callback' => 'esc_url_raw',
			)
		);
		$wp_customize->add_control(
			$key,
			array(
				'label'   => $conf[0],
				'section' => 'eynna_contact',
				'type'    => 'url',
			)
		);
	}

	/* ---------- Colors ---------- */
	$wp_customize->add_section(
		'eynna_colors',
		array(
			'title' => esc_html__( 'Boje', 'eynna-cinematic' ),
			'panel' => 'eynna_panel',
		)
	);

	$colors = array(
		'eynna_color_ink'  => array( esc_html__( 'Osnovna tamna', 'eynna-cinematic' ), '#0f0b09' ),
		'eynna_color_gold' => array( esc_html__( 'Zlatni akcenat', 'eynna-cinematic' ), '#d9b878' ),
	);
	foreach ( $colors as $key => $conf ) {
		$wp_customize->add_setting(
			$key,
			array(
				'default'           => $conf[1],
				'sanitize_callback' => 'sanitize_hex_color',
			)
		);
		$wp_customize->add_control(
			new WP_Customize_Color_Control(
				$wp_customize,
				$key,
				array(
					'label'   => $conf[0],
					'section' => 'eynna_colors',
				)
			)
		);
	}
}
add_action( 'customize_register', 'eynna_customize_register' );
