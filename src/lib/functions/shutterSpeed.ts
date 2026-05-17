// 本文件接收一个float快门速度参数，返回一个1/125类型的string快门速度参数
export default function shutterSpeed(shutterTime: string): string | undefined {
	if (!shutterTime) return undefined;
	const time = parseFloat(shutterTime);
	if (!Number.isFinite(time) || time <= 0) return undefined;
	if (time >= 1) {
		// 保留整数部分
		return `${Math.round(time)}`;
	}
	const fraction = Math.round(1 / time);
	return `1/${fraction}`;
}
