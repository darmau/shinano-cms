export default function getDateFormat(isoString: string, withTime: boolean = false) {
	const today = new Date(isoString) || new Date();
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
