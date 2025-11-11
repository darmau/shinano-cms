import { derived } from 'svelte/store';
import translations from './translations';
import { lang } from '$lib/functions/localStorage';
import languages from '$lib/functions/languages';

export const locale = lang;
export const locales = languages;

function translate(locale: string, key: string, vars: string | object) {
	// Let's throw some errors if we're trying to use keys/locales that don't exist.
	// We could improve this by using Typescript and/or fallback values.
	if (!key) throw new Error('no key provided to $t()');
	if (!locale) throw new Error(`no translation for key "${key}"`);

	// Grab the translation from the translations object.
	let text = translations[locale][key];

	if (!text) {
		return translations['zh-CN'][key];
	}

	// Replace any passed in variables in the translation string.
	Object.keys(vars).map((k) => {
		const regex = new RegExp(`{{${k}}}`, 'g');
		text = text.replace(regex, (vars as Record<string, string>)[k]);
	});

	return text;
}

export const t = derived(
	locale,
	($locale) =>
		(key: string, vars = {}) =>
			translate($locale, key, vars)
);
