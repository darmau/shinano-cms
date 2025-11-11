<script lang="ts">
	import UploadFile from '$components/image/UploadFile.svelte';
	import PageTitle from '$components/PageTitle.svelte';
	import ImageGrid from '$components/image/ImageGrid.svelte';
	import Pagination from '$components/Pagination.svelte';
	import { invalidateAll } from '$app/navigation';
	import { t } from '$lib/functions/i18n';

	export let data;

	async function refresh() {
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{$t('media')}</title>
</svelte:head>

<div class="">
	<PageTitle title={$t('media')} />
	<UploadFile {refresh} />
	<ImageGrid {data} />
	<Pagination count={data.count} page={data.page} limit={data.limit} path={data.path} />
</div>
