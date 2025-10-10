<script lang="ts">
	const { count } = $props<{ count: number }>();
</script>

<span
	class = "absolute top-1/2 right-2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
>
	{count}
</span>
