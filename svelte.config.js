import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: false
	},
	preprocess: [vitePreprocess(), preprocess()],
	kit: {
		alias: {
			'$assets': './src/assets',
			'$components': './src/lib/components',
			'@skeletonlabs/skeleton': './src/lib/compat/skeleton/index.ts',
			'$svelte-kit': './.svelte-kit',
			'$types': './src/types',
		},
		adapter: adapter()
	}
};

export default config;
