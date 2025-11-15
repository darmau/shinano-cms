<script lang="ts">
	import AI from '$components/setting/AI.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<AI {data} />

