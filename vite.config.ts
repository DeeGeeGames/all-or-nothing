import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from "vite-plugin-svgr";

const gitVersion = execSync('git describe --tags --always').toString().trimEnd();

// https://vitejs.dev/config/
export default defineConfig(async () => {
	const isElectron = process.env['BUILD_TARGET'] === 'electron';

	const plugins: PluginOption[] = [
		react(),
		svgr(),
	];

	if (isElectron) {
		// Stub out PWA virtual module so renderer code that imports it still compiles
		plugins.push({
			name: 'stub-pwa-register',
			resolveId(id) {
				return id === 'virtual:pwa-register' ? id : undefined;
			},
			load(id) {
				return id === 'virtual:pwa-register' ? 'export function registerSW() {}' : undefined;
			},
		});

		const { default: electron } = await import('vite-plugin-electron/simple');
		plugins.push(
			...await electron({
				main: {
					entry: 'electron/main.ts',
					vite: {
						define: {
							__STEAM_APP_ID__: Number(process.env['STEAM_APP_ID'] || 480),
						},
						build: {
							outDir: 'dist-electron',
							rollupOptions: {
								external: ['steamworks.js'],
							},
						},
					},
				},
				preload: {
					input: 'electron/preload.ts',
					vite: {
						build: {
							outDir: 'dist-electron',
						},
					},
				},
			})
		);
	} else {
		plugins.push(
			VitePWA({
				registerType: 'autoUpdate',
				manifest: {
					name: 'All or Nothing',
					orientation: 'portrait',
					short_name: 'All|Nothing',
					id: '/?source=pwa',
					start_url: '/?source=pwa',
					theme_color: '#ffffff',
					background_color: '#ffffff',
					display: 'standalone',
					icons: [
						{
							src: '/assets/android-chrome-192x192.png',
							sizes: '192x192',
							type: 'image/png'
						}, {
							src: '/assets/android-chrome-512x512.png',
							sizes: '512x512',
							type: 'image/png'
						}
					],
					screenshots: [
						{
							src: '/assets/screenshot-1.png',
							type: 'image/png',
							sizes: '880x540',
							form_factor: 'wide'
						},
						{
							src: '/assets/screenshot-2.png',
							type: 'image/png',
							sizes: '355x735',
							form_factor: 'narrow'
						}
					]
				}
			}),
		);
	}

	return {
		base: process.env['VITE_BASE'] ?? (isElectron ? './' : '/'),
		define: {
			__APP_VERSION__: JSON.stringify(gitVersion),
		},
		build: {
			target: 'esnext',
			outDir: 'dist/web',
		},
		plugins,
		resolve: {
			alias: {
				'@': resolve(__dirname, './src'),
			},
		},
	};
});
