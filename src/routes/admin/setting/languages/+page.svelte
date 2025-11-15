<script lang="ts">
	import Language from '$components/setting/Language.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Language {data} />

