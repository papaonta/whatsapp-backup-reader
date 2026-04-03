import { copyFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Replace the ONNX Runtime JSEP WASM (21MB, includes unused WebGPU/WebNN)
// with the CPU-only variant (11MB). Safe because the transcription worker
// uses device: 'wasm' exclusively — GPU backends are never initialized.
function ortWasmOptimize(): Plugin {
	const src = resolve(
		'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
	);
	const dests = [
		resolve(
			'node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm',
		),
		resolve(
			'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',
		),
	];
	return {
		name: 'ort-wasm-optimize',
		buildStart() {
			for (const dest of dests) copyFileSync(src, dest);
		},
	};
}

export default defineConfig({
	// Inject version at build time
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
	plugins: [
		ortWasmOptimize(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Use localStorage and cookie for locale persistence (not URL)
			// URL-based locale doesn't work well with GitHub Pages base path
			// preferredLanguage uses browser's navigator.language as fallback
			strategy: ['localStorage', 'cookie', 'preferredLanguage', 'baseLocale'],
		}),
		tailwindcss(),
		sveltekit(),
	],
	// Electron needs to use relative paths
	base: './',
	build: {
		// Performance optimizations
		target: 'esnext',
		minify: 'esbuild',
		cssMinify: true,
	},
});
