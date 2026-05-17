// 本函数接收一个数字，转换成合适的文件大小单位，如 kb mb gb
export function fileSize(size: number) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	if (!Number.isFinite(size)) return `0.00 ${units[0]}`;
	let value = Math.max(size, 0);
	let i = 0;
	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i++;
	}
	return `${value.toFixed(2)} ${units[i]}`;
}
