<?php
/**
 * Render every theme template through the shim and fail on any PHP diagnostic.
 *
 * Usage: php tests/render.php [output-dir]
 */

require __DIR__ . '/wp-shim.php';

$out_dir = isset( $argv[1] ) ? rtrim( $argv[1], '/' ) : sys_get_temp_dir() . '/eynna-render';
if ( ! is_dir( $out_dir ) ) {
	mkdir( $out_dir, 0777, true );
}

$theme = dirname( __DIR__ ) . '/wordpress/eynna-cinematic';

// Load the theme exactly as WordPress would.
require $theme . '/functions.php';
do_action( 'after_setup_theme' );

$cases = array(
	'home-nowoo' => array(
		'file' => $theme . '/page-templates/cinematic-home.php',
		'ctx'  => array(
			'is_singular'      => true,
			'is_front_page'    => true,
			'is_page_template' => 'page-templates/cinematic-home.php',
			'has_woo'          => false,
		),
		'loop' => 1,
	),
	'home-woo' => array(
		'file' => $theme . '/page-templates/cinematic-home.php',
		'ctx'  => array(
			'is_singular'      => true,
			'is_front_page'    => true,
			'is_page_template' => 'page-templates/cinematic-home.php',
			'has_woo'          => true,
		),
		'loop' => 1,
		'woo'  => true,
	),
	'home-video' => array(
		'file' => $theme . '/page-templates/cinematic-home.php',
		'ctx'  => array(
			'is_singular'      => true,
			'is_front_page'    => true,
			'is_page_template' => 'page-templates/cinematic-home.php',
			'has_woo'          => true,
			'hero_video'       => './hero.mp4',
			'hero_poster'      => './hero.jpg',
		),
		'loop' => 1,
		'woo'  => true,
	),
	'index' => array(
		'file' => $theme . '/index.php',
		'ctx'  => array( 'is_home' => true, 'is_singular' => false, 'has_sidebar' => true ),
		'loop' => 3,
	),
	'single' => array(
		'file' => $theme . '/single.php',
		'ctx'  => array( 'is_singular' => true, 'has_sidebar' => true ),
		'loop' => 1,
	),
	'page' => array(
		'file' => $theme . '/page.php',
		'ctx'  => array( 'is_singular' => true ),
		'loop' => 1,
	),
	'page-full-width' => array(
		'file' => $theme . '/page-templates/full-width.php',
		'ctx'  => array( 'is_singular' => true, 'is_page_template' => 'page-templates/full-width.php' ),
		'loop' => 1,
	),
	'archive' => array(
		'file' => $theme . '/archive.php',
		'ctx'  => array( 'is_singular' => false ),
		'loop' => 3,
	),
	'search' => array(
		'file' => $theme . '/search.php',
		'ctx'  => array( 'is_singular' => false ),
		'loop' => 2,
	),
	'search-empty' => array(
		'file' => $theme . '/search.php',
		'ctx'  => array( 'is_singular' => false ),
		'loop' => 0,
	),
	'404' => array(
		'file' => $theme . '/404.php',
		'ctx'  => array( 'is_singular' => false ),
		'loop' => 0,
	),
);

$pass   = 0;
$fail   = 0;
$report = array();

foreach ( $cases as $name => $case ) {
	// Reset per-case state.
	$GLOBALS['eynna_ctx'] = array_merge(
		array(
			'is_home'          => false,
			'is_front_page'    => false,
			'is_singular'      => false,
			'is_page_template' => false,
			'has_woo'          => false,
			'has_sidebar'      => false,
			'hero_video'       => '',
			'hero_poster'      => '',
		),
		$case['ctx']
	);

	if ( ! empty( $case['woo'] ) ) {
		eynna_shim_define_woo();
	}

	eynna_shim_set_loop( array_slice( $GLOBALS['eynna_posts'], 0, $case['loop'] ) );

	$GLOBALS['eynna_styles']    = array();
	$GLOBALS['eynna_scripts']   = array();
	$GLOBALS['eynna_localized'] = array();
	eynna_scripts();

	ob_start();
	try {
		include $case['file'];
		$html = ob_get_clean();

		if ( strlen( $html ) < 400 ) {
			throw new RuntimeException( 'Suspiciously short output: ' . strlen( $html ) . ' bytes' );
		}

		file_put_contents( "{$out_dir}/{$name}.html", $html );
		$report[] = sprintf( '  [PASS] %-16s %6d bytes', $name, strlen( $html ) );
		$pass++;
	} catch ( Throwable $e ) {
		ob_end_clean();
		$report[] = sprintf(
			"  [FAIL] %-16s %s\n           at %s:%d",
			$name,
			$e->getMessage(),
			str_replace( dirname( __DIR__ ) . '/', '', $e->getFile() ),
			$e->getLine()
		);
		$fail++;
	}
}

echo implode( "\n", $report ), "\n";
echo "\nRendered to {$out_dir}\n";
echo sprintf( "RESULT: %d passed, %d failed\n", $pass, $fail );

exit( $fail === 0 ? 0 : 1 );
