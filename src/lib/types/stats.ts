export interface StatsRow {
	date: string;
	article_count: number;
	photo_count: number;
	thought_count: number;
	image_count: number;
	comment_count: number;
	message_count: number;
	user_count: number;
}

export type StatsMetricKey = Exclude<keyof StatsRow, 'date'>;
