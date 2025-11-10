export class ThirdPartyAPIs {
	private readonly apiNames: Map<string, string> = new Map([
		['config_UNSPLASH_ACCESS_KEY', ''],
		['config_UNSPLASH_SECRET_KEY', ''],
		['config_MAPBOX', ''],
		['config_AMAP', ''],
		['config_URL_PREFIX', ''],
		['config_RESEND', ''],
		['config_BARK_SERVER', ''],
	])

	public array() {
		return Array.from(this.apiNames.keys())
	}

	public emptyObject() {
		return Object.fromEntries(this.apiNames);
	}
}
