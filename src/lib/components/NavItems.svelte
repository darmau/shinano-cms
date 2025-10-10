<script lang="ts">
	import Home from '$assets/icons/home.svelte';
	import Message from '$assets/icons/inbox.svelte';
	import Media from '$assets/icons/photo.svelte';
	import Article from '$assets/icons/document-text.svelte';
	import Photo from '$assets/icons/camera.svelte';
	import Memo from '$assets/icons/light-bulb.svelte';
	import Category from '$assets/icons/rectangle-stack.svelte';
	import Comment from '$assets/icons/chat-bubble-left.svelte';
	import User from '$assets/icons/users.svelte';
	import Setting from '$assets/icons/cog.svelte';
	import { page } from '$app/stores';
	import { t } from '$lib/functions/i18n';
	import UnreadBadge from '$components/UnreadBadge.svelte';
	import Book from '$assets/icons/book.svelte';

	export let data;
	export let menuOpen;
	export let message;
	export let comment;

	const navItems = [
		{ name: 'home', href: '/admin', icon: Home },
		{ name: 'message', href: '/admin/message/1', icon: Message },
		{ name: 'media', href: '/admin/media/1', icon: Media },
		{ name: 'article', href: '/admin/article/1', icon: Article },
		{ name: 'photo', href: '/admin/photo/1', icon: Photo },
		{ name: 'thought', href: '/admin/thought/1', icon: Memo },
		{ name: 'book', href: '/admin/book/1', icon: Book },
		{ name: 'category', href: '/admin/category', icon: Category },
		{ name: 'comment', href: '/admin/comment/1', icon: Comment },
		{ name: 'user', href: '/admin/users/1', icon: User },
		{ name: 'setting', href: '/admin/setting', icon: Setting }
	];
</script>

<nav class = "flex flex-1 flex-col">
	<ul role = "list" class = "flex flex-1 flex-col gap-y-2">

		{#each navItems as item}
			<li class = "relative">
				<a
					href = {item.href}
					on:click = {() => menuOpen = false}
					data-sveltekit-preload-data = "tap"
					class = {$page.url.pathname === item.href ?
					'text-cyan-600 bg-gray-50 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold' : 'text-gray-700 hover:text-cyan-600 hover:bg-gray-50 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'}
				>
					<svelte:component
						this = {item.icon} classList = {
                    $page.url.pathname === item.href
                      ? 'h-6 w-6 shrink-0 text-cyan-600'
                      : 'h-6 w-6 shrink-0 text-gray-400 group-hover:text-cyan-600'
                    }
					/>
					{$t(item.name)}
				</a>
				{#if item.name === 'message' && message > 0}
					<UnreadBadge count={message} />
				{:else if item.name === 'comment' && comment > 0}
					<UnreadBadge count={comment} />
				{/if}
			</li>
		{/each}

	</ul>
</nav>
