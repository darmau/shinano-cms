<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { toastStore, type ToastInternal } from './toast-store';

	type ToastPosition = 't' | 'b' | 'tr' | 'br';

	export let position: ToastPosition = 't';

	const positionClasses: Record<ToastPosition, string> = {
		t: 'top-4 left-1/2 -translate-x-1/2 sm:top-6',
		b: 'bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6',
		tr: 'top-4 right-4 sm:top-6 sm:right-6',
		br: 'bottom-4 right-4 sm:bottom-6 sm:right-6'
	};

	function backgroundClass(background?: ToastInternal['background']) {
		switch (background) {
			case 'variant-filled-success':
				return 'bg-emerald-500 text-white shadow-emerald-900/30';
			case 'variant-filled-error':
				return 'bg-red-500 text-white shadow-red-900/30';
			default:
				return 'bg-zinc-800 text-white shadow-black/20';
		}
	}

	function dismiss(id: number) {
		toastStore.dismiss(id);
	}
</script>

<svelte:window
	on:keydown={(event) => {
		if (event.key === 'Escape') {
			toastStore.clear();
		}
	}}
/>

<div
	class={`pointer-events-none fixed z-50 flex max-w-full flex-col gap-3 px-4 sm:px-0 ${positionClasses[position]}`}
>
	{#each $toastStore as toast (toast.id)}
		<article
			role="status"
			class={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ${backgroundClass(toast.background)}`}
			in:fly={{ y: position.startsWith('t') ? -12 : 12, duration: 150 }}
			out:fade={{ duration: 150 }}
		>
			<p class="pr-6 leading-snug">{toast.message}</p>
			{#if !toast.hideDismiss}
				<button
					type="button"
					aria-label="Dismiss notification"
					class="absolute right-2 top-2 rounded-full p-1 text-white/80 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-transparent"
					on:click={() => dismiss(toast.id)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="h-4 w-4"
					>
						<path
							fill-rule="evenodd"
							d="M5.23 5.23a.75.75 0 0 1 1.06 0L10 8.94l3.71-3.71a.75.75 0 1 1 1.06 1.06L11.06 10l3.71 3.71a.75.75 0 1 1-1.06 1.06L10 11.06l-3.71 3.71a.75.75 0 1 1-1.06-1.06L8.94 10 5.23 6.29a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			{/if}
		</article>
	{/each}
</div>
