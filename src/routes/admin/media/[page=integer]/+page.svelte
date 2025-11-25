<script lang="ts">
	import UploadFile from '$components/image/UploadFile.svelte';
	import PageTitle from '$components/PageTitle.svelte';
	import ImageGrid from '$components/image/ImageGrid.svelte';
	import Pagination from '$components/Pagination.svelte';
	import { invalidateAll } from '$app/navigation';

	export let data;

	async function refresh() {
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>媒体</title>
</svelte:head>

<div class="">
	<PageTitle title="媒体" />
	<UploadFile {refresh} />
	<ImageGrid {data} />
	<Pagination count={data.count} page={data.page} limit={data.limit} path={data.path} />
</div>
