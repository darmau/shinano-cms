import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: undefined,
		experimental: {
			async: true
		}
	},
	preprocess: [vitePreprocess()],
	kit: {
		experimental: {
			remoteFunctions: true
		},
		alias: {
			$assets: './src/assets',
			$components: './src/lib/components',
			'$svelte-kit': './.svelte-kit',
			$types: './src/types'
		},
		adapter: adapter({
			config: 'wrangler.jsonc'
		})
	}
};

export default config;
