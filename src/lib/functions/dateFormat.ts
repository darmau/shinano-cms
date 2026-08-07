// 库里的时间列大多可空（created_at / published_at / taken_at），调用点也就到处是
// `?? ''`。既然对无效输入本来就是"退回当前时间"，null 与 undefined 一并接收更实在。
export default function getDateFormat(
	isoString: string | null | undefined,
	withTime: boolean = false
) {
	const parsed = new Date(isoString ?? '');
	const today = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	const year = today.getFullYear();
	const month = ('0' + (today.getMonth() + 1)).slice(-2);
	const day = ('0' + today.getDate()).slice(-2);
	const hours = today.getHours().toString().padStart(2, '0');
	const minutes = today.getMinutes().toString().padStart(2, '0');
	const seconds = today.getSeconds().toString().padStart(2, '0');
	if (withTime) {
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
	} else {
		return `${year}-${month}-${day}`;
	}
}
