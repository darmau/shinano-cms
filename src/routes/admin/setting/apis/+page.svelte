<script lang="ts">
	import APIs from '$components/setting/APIs.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<APIs {data} />

