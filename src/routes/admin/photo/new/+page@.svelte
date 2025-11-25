<script lang="ts">
	import PhotoEditor from '$components/PhotoEditor.svelte';
	import type { PageData as RoutePageData } from './$types';
	import type { PageData as PhotoEditorData } from '$lib/types/photo';

	export let data: RoutePageData;

	const editorData: PhotoEditorData = {
		prefix: data.prefix,
		currentLanguage: data.currentLanguage,
		photoContent: data.photoContent,
		categories: data.categories,
		otherVersions: data.otherVersions,
		allLanguages: data.allLanguages
	};
</script>

<div class="mx-auto p-8 max-w-6xl">
	<nav class="flex mb-8" aria-label="Breadcrumb">
		<ol role="list" class="flex items-center space-x-4">
			<li>
				<div>
					<a data-sveltekit-preload-data href="/admin" class="text-gray-400 hover:text-gray-500">
						<svg
							class="h-5 w-5 flex-shrink-0"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="sr-only">首页</span>
					</a>
				</div>
			</li>
			<li>
				<div class="flex items-center">
					<svg
						class="h-5 w-5 flex-shrink-0 text-gray-300"
						fill="currentColor"
						viewBox="0 0 20 20"
						aria-hidden="true"
					>
						<path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
					</svg>
					<a
						data-sveltekit-preload-data
						href={`/admin/photo/${data.currentLanguage.lang}/1`}
						class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">照片</a
					>
				</div>
			</li>
		</ol>
	</nav>

	<PhotoEditor data={editorData} isSaved={false} />
</div>
