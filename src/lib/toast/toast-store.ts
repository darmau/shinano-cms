import { browser } from '$app/environment';
import { writable } from 'svelte/store';

type ToastBackground = 'variant-filled-success' | 'variant-filled-error' | string;

export interface ToastOptions {
	message: string;
	background?: ToastBackground;
	hideDismiss?: boolean;
	timeout?: number;
}

interface ToastInternal extends ToastOptions {
	id: number;
}

const DEFAULT_TIMEOUT = 4000;

const timers = new Map<number, ReturnType<typeof setTimeout>>();
let idCounter = 0;

const { subscribe, update } = writable<ToastInternal[]>([]);

function scheduleDismiss(id: number, timeout: number | undefined) {
	if (!browser) return;
	const duration = typeof timeout === 'number' ? timeout : DEFAULT_TIMEOUT;
	if (duration <= 0 || !Number.isFinite(duration)) return;
	const timer = setTimeout(() => {
		dismiss(id);
	}, duration);
	timers.set(id, timer);
}

function trigger(toast: ToastOptions) {
	const id = ++idCounter;
	const entry: ToastInternal = {
		hideDismiss: false,
		...toast,
		id
	};

	update((items) => [...items, entry]);
	scheduleDismiss(id, toast.timeout);
	return id;
}

function dismiss(id: number) {
	if (browser) {
		const timer = timers.get(id);
		if (timer) {
			clearTimeout(timer);
			timers.delete(id);
		}
	}

	update((items) => items.filter((item) => item.id !== id));
}

function clear() {
	if (browser) {
		timers.forEach((timer) => clearTimeout(timer));
		timers.clear();
	}
	update(() => []);
}

export const toastStore = {
	subscribe,
	trigger,
	dismiss,
	clear
};

export function getToastStore() {
	return toastStore;
}

export function initializeStores() {
	// Retained for compatibility with the previous Skeleton API.
}

export type { ToastInternal };
