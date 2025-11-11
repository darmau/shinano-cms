import { writable } from 'svelte/store';
import { browser } from '$app/environment';

let storedLang = 'zh-CN';

if (browser) {
	storedLang = localStorage.getItem('lang') || 'zh-CN';
}
export const lang = writable(storedLang);

if (browser) {
	lang.subscribe((value) => {
		localStorage.setItem('lang', value);
	});
}
