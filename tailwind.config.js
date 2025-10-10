/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			screens: {
				'3xl': '1600px'
			}
		}
	},
	plugins: [
		require('@tailwindcss/container-queries'),
		forms,
		require('@tailwindcss/typography')
	]
};
