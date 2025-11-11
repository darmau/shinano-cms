// 本函数接收一个2021-12-25T01:04:08+00:00格式的时间字符串，返回一个本地时间字符串
export function localTime(time: string): string {
	const date = new Date(time);

	const options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		weekday: 'short',
		hour: 'numeric',
		minute: 'numeric'
	};

	const formatter = new Intl.DateTimeFormat('zh-Hans-CN-u-ca-gregory', options);
	return formatter.format(date);
}
