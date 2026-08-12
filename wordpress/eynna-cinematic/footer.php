<?php
/**
 * Site footer.
 *
 * @package Eynna_Cinematic
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>

	<footer id="colophon" class="footer" role="contentinfo">
		<div class="footer__big" aria-hidden="true"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></div>

		<?php if ( is_active_sidebar( 'footer-1' ) || is_active_sidebar( 'footer-2' ) || is_active_sidebar( 'footer-3' ) ) : ?>
			<div class="footer__cols">
				<?php for ( $i = 1; $i <= 3; $i++ ) : ?>
					<?php if ( is_active_sidebar( 'footer-' . $i ) ) : ?>
						<div class="footer__col"><?php dynamic_sidebar( 'footer-' . $i ); ?></div>
					<?php endif; ?>
				<?php endfor; ?>
			</div>
		<?php elseif ( has_nav_menu( 'footer' ) ) : ?>
			<div class="footer__cols">
				<div class="footer__col">
					<?php
					wp_nav_menu(
						array(
							'theme_location' => 'footer',
							'container'      => false,
							'menu_class'     => 'footer__menu',
							'depth'          => 1,
						)
					);
					?>
				</div>
			</div>
		<?php endif; ?>

		<?php eynna_social_links(); ?>

		<div class="footer__legal">
			<?php
			printf(
				/* translators: 1: year, 2: site name. */
				esc_html__( '© %1$s %2$s', 'eynna-cinematic' ),
				esc_html( gmdate( 'Y' ) ),
				esc_html( get_bloginfo( 'name' ) )
			);
			?>
		</div>
	</footer>
</div><!-- #page -->

<?php wp_footer(); ?>
</body>
</html>
