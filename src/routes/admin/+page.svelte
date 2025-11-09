<script lang="ts">
	import PageTitle from '$components/PageTitle.svelte';
	import type { StatsMetricKey, StatsRow } from '$lib/types/stats';

	type PageData = {
		is_admin: boolean;
		unread_message_count: number;
		stats: StatsRow[];
	};

	export let data: PageData;

	const summaryMetrics: Array<{ key: StatsMetricKey; label: string; description: string }> = [
		{ key: 'article_count', label: '文章', description: '已发布文章总数' },
		{ key: 'photo_count', label: '照片', description: '照片图库累积' },
		{ key: 'thought_count', label: '想法', description: '想法/日志条目' },
		{ key: 'comment_count', label: '评论', description: '累计评论互动' },
		{ key: 'message_count', label: '私信', description: '收到的访客私信' },
		{ key: 'user_count', label: '用户', description: '注册用户总量' }
	];

	const formatDelta = (delta: number) => {
		if (delta === 0) return '较昨日持平';
		return `${delta > 0 ? '+' : ''}${delta} / 日`;
	};

	$: latestSnapshot = data.stats.length ? data.stats[data.stats.length - 1] : undefined;
	$: previousSnapshot = data.stats.length > 1 ? data.stats[data.stats.length - 2] : undefined;
	$: summary = summaryMetrics.map((metric) => {
		const currentValue = latestSnapshot ? latestSnapshot[metric.key] ?? 0 : 0;
		const previousValue = previousSnapshot ? previousSnapshot[metric.key] ?? 0 : 0;
		return {
			...metric,
			value: currentValue,
			delta: currentValue - previousValue
		};
	});
</script>

{#if !data.is_admin}
	<div class="rounded-lg border border-amber-200 bg-amber-50 px-6 py-10 text-amber-900 shadow-sm">
		<p class="text-lg font-semibold">该页面仅限管理员访问。</p>
		<p class="mt-2 text-sm text-amber-700">如需访问仪表盘，请联系站点管理员开通权限。</p>
	</div>
{:else}
	<div class="space-y-10">
		<PageTitle title="仪表盘" />

		<section class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
			{#each summary as metric}
				<div class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
					<dt class="text-sm font-medium text-slate-500">{metric.label}</dt>
					<dd class="mt-2 text-3xl font-semibold text-slate-900">
						{metric.value}
					</dd>
					<p class="mt-3 text-xs text-slate-500">{metric.description}</p>
					{#if data.stats.length > 1}
						<p
							class="mt-2 text-sm font-medium"
							class:text-emerald-600={metric.delta > 0}
							class:text-rose-600={metric.delta < 0}
							class:text-slate-500={metric.delta === 0}
						>
							{formatDelta(metric.delta)}
						</p>
					{/if}
				</div>
			{/each}
		</section>

		{#if data.unread_message_count > 0}
			<section class="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900">
				<p class="text-sm">
					目前有 <span class="font-semibold">{data.unread_message_count}</span> 条未读私信等待处理。
				</p>
			</section>
		{/if}

		{#if data.stats.length === 0}
			<section class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
				<p>统计数据尚未生成，稍后再来查看仪表盘。</p>
			</section>
		{/if}
	</div>
{/if}
