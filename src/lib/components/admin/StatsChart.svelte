<script lang="ts">
	import type { StatsMetricKey, StatsRow } from '$lib/types/stats';

	type Series = {
		key: StatsMetricKey;
		label: string;
		color: string;
		data: number[];
	};

	export let stats: StatsRow[] = [];

	const width = 720;
	const height = 360;
	const padding = { top: 24, right: 24, bottom: 48, left: 64 };
	const innerWidth = width - padding.left - padding.right;
	const innerHeight = height - padding.top - padding.bottom;

	const metricDefinitions: Array<Omit<Series, 'data'>> = [
		{ key: 'article_count', label: '文章', color: '#2563eb' },
		{ key: 'photo_count', label: '照片', color: '#f97316' },
		{ key: 'thought_count', label: '想法', color: '#059669' },
		{ key: 'image_count', label: '图片', color: '#d946ef' },
		{ key: 'comment_count', label: '评论', color: '#7c3aed' },
		{ key: 'message_count', label: '私信', color: '#ef4444' },
		{ key: 'user_count', label: '用户', color: '#0ea5e9' }
	];

	const numberFormatter = new Intl.NumberFormat('zh-CN');

	const niceCeil = (value: number): number => {
		if (value <= 0) return 1;
		const exponent = Math.floor(Math.log10(value));
		const magnitude = 10 ** exponent;
		const normalized = value / magnitude;
		const steps = [1, 2, 5, 10];
		const selected = steps.find((step) => normalized <= step) ?? 10;
		return selected * magnitude;
	};

	$: series = metricDefinitions.map<Series>((metric) => ({
		...metric,
		data: stats.map((row) => row[metric.key] ?? 0)
	}));

	$: yValues = series.flatMap((metric) => metric.data);
	$: maxValue = yValues.length ? Math.max(...yValues) : 0;
	$: yUpperBound = niceCeil(maxValue);
	$: yTicks = Array.from({ length: 5 + 1 }, (_, index) => (index / 5) * yUpperBound);

	$: xPositions = stats.map((_, index) => {
		if (stats.length <= 1) {
			return padding.left + innerWidth / 2;
		}
		return padding.left + (index / (stats.length - 1)) * innerWidth;
	});

	$: xLabelInterval = Math.max(1, Math.ceil(stats.length / 8));
	$: xLabels = stats.map((row) => {
		const date = new Date(row.date);
		return new Intl.DateTimeFormat('zh-CN', {
			month: 'numeric',
			day: 'numeric'
		}).format(date);
	});

	const yScale = (value: number) => {
		if (yUpperBound === 0) return padding.top + innerHeight;
		return padding.top + innerHeight - (value / yUpperBound) * innerHeight;
	};

	const buildPoints = (data: number[]) =>
		data.map((value, index) => `${xPositions[index]},${yScale(value)}`).join(' ');

	$: visibleSeries = series.filter((metric) => metric.data.some((value) => value > 0));
	$: plottedSeries = visibleSeries.length > 0 ? visibleSeries : series;
</script>

{#if stats.length === 0}
	<div class="empty">暂无统计数据</div>
{:else}
	<div class="chart">
		<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="内容统计折线图">
			<title>内容统计趋势</title>
			<desc>展示最近的内容发布与互动数量变化趋势</desc>

			<!-- 背景 -->
			<rect x="0" y="0" width={width} height={height} fill="#ffffff" />

			<!-- 网格与刻度 -->
			{#each yTicks as tick}
				{@const y = yScale(tick)}
				<line
					x1={padding.left}
					y1={y}
					x2={width - padding.right}
					y2={y}
					stroke="#e5e7eb"
					stroke-dasharray="4 4"
				/>
				<text x={padding.left - 12} y={y + 4} text-anchor="end" class="tick-label">
					{numberFormatter.format(Math.round(tick))}
				</text>
			{/each}

			<!-- 坐标轴 -->
			<line
				x1={padding.left}
				y1={padding.top + innerHeight}
				x2={width - padding.right}
				y2={padding.top + innerHeight}
				stroke="#0f172a"
				stroke-width="1"
			/>
			<line
				x1={padding.left}
				y1={padding.top}
				x2={padding.left}
				y2={padding.top + innerHeight}
				stroke="#0f172a"
				stroke-width="1"
			/>

			<!-- 数据线条 -->
			{#each plottedSeries as line}
				{#if line.data.length > 0}
					<polyline
						points={buildPoints(line.data)}
						fill="none"
						stroke={line.color}
						stroke-width="1"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>

					{#each line.data as value, index}
						<circle
							cx={xPositions[index]}
							cy={yScale(value)}
							r="3.5"
							fill="#ffffff"
							stroke={line.color}
							stroke-width="1"
						>
							<title>{`${line.label}: ${value}`}</title>
						</circle>
					{/each}
				{/if}
			{/each}

			<!-- 横轴标签 -->
			{#each xLabels as label, index}
				{#if index % xLabelInterval === 0 || index === xLabels.length - 1}
					<text
						x={xPositions[index]}
						y={padding.top + innerHeight + 20}
						text-anchor="middle"
						class="tick-label"
					>
						{label}
					</text>
				{/if}
			{/each}
		</svg>

		<div class="legend" aria-label="数据系列图例">
			{#each plottedSeries as line}
				<div class="legend-item">
					<span class="swatch" style={`background-color:${line.color}`}></span>
					<span>{line.label}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.tick-label {
		font-size: 12px;
		fill: #475569;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		font-size: 14px;
		color: #334155;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.swatch {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 9999px;
	}

	.empty {
		padding: 24px;
		border: 1px dashed #cbd5f5;
		border-radius: 12px;
		text-align: center;
		color: #64748b;
		background: #f8fafc;
	}

	@media (max-width: 900px) {
		.chart {
			gap: 12px;
		}
	}
</style>
