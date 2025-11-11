import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfigRow } from '$lib/types/config';

export type LocationPayload = {
	exif?: Record<string, unknown> | null;
	latitude?: number | string | null;
	longitude?: number | string | null;
};

export type LocationConfig = {
	mapboxToken: string | null;
	amapToken?: string | null;
};

type Coordinates = {
	latitude: number;
	longitude: number;
};

type MapboxFeature = {
	properties?: {
		full_address?: string;
		context?: {
			country?: {
				country_code?: string;
			};
		};
	};
	place_name?: string;
};

type MapboxResponse = {
	features?: MapboxFeature[];
};

type AMapResponse = {
	status?: string;
	regeocode?: {
		formatted_address?: string;
	};
};

export async function loadLocationConfig(supabase: SupabaseClient) {
	const { data, error } = await supabase
		.from('config')
		.select('key,value')
		.in('key', ['config_MAPBOX', 'config_AMAP']);

	if (error) {
		throw error;
	}

	const configMap = new Map((data as ConfigRow[]).map(({ key, value }) => [key, value ?? '']));
	return {
		mapboxToken: configMap.get('config_MAPBOX') ?? null,
		amapToken: configMap.get('config_AMAP') ?? null
	};
}

export async function resolveLocationWithSupabase(
	payload: LocationPayload,
	supabase: SupabaseClient
) {
	const config = await loadLocationConfig(supabase);
	return resolveLocation(payload, config);
}

export async function resolveLocation(payload: LocationPayload, config: LocationConfig) {
	const coordinatesSource = payload?.exif ?? payload;
	const coordinates = normalizeCoordinates(coordinatesSource);

	if (!coordinates) {
		return 'No GPS information';
	}

	const mapboxToken = config.mapboxToken;
	if (!mapboxToken) {
		return 'No mapbox api provided';
	}

	const countryCode = await getCountryCode(coordinates, mapboxToken);
	if (!countryCode) {
		console.error('mapbox country lookup failed', coordinates);
		return null;
	}

	const amapToken = config.amapToken;
	if (amapToken && isAmapPreferred(countryCode)) {
		const amapAddress = await reverseGeocodeWithAmap(coordinates, amapToken);
		if (amapAddress) {
			return amapAddress;
		}
		console.error('Failed to resolve location via AMap', countryCode);
	}

	const language = languageMap.get(countryCode) ?? 'en';
	const worldview = worldviewMap.get(countryCode) ?? 'us';
	const fallbackAddress = await reverseGeocodeWithMapbox(coordinates, mapboxToken, {
		language,
		worldview
	});

	if (!fallbackAddress) {
		console.error('Unable to resolve location via Mapbox', {
			coordinates,
			language,
			worldview
		});
		return null;
	}

	return fallbackAddress;
}

function normalizeCoordinates(payload: unknown): Coordinates | null {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	const source = payload as {
		latitude?: number | string | null;
		longitude?: number | string | null;
	};
	const latitude = Number(source.latitude ?? (source as Record<string, unknown>)?.['lat']);
	const longitude = Number(source.longitude ?? (source as Record<string, unknown>)?.['lng']);

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return { latitude, longitude };
}

async function getCountryCode(coordinates: Coordinates, mapboxToken: string) {
	const searchParams = new URLSearchParams({
		longitude: String(coordinates.longitude),
		latitude: String(coordinates.latitude),
		types: 'country',
		access_token: mapboxToken
	});

	try {
		const response = await fetch(
			`https://api.mapbox.com/search/geocode/v6/reverse?${searchParams.toString()}`
		);

		if (!response.ok) {
			console.error(
				'mapbox country lookup request failed',
				response.status,
				await safeReadBody(response)
			);
			return null;
		}

		const data = (await response.json()) as MapboxResponse;
		const feature = data.features?.[0];
		const rawCountry = feature?.properties?.context?.country?.country_code;
		return rawCountry?.toUpperCase() ?? null;
	} catch (err) {
		console.error('mapbox country lookup exception', err);
		return null;
	}
}

function isAmapPreferred(countryCode: string) {
	return countryCode === 'CN' || countryCode === 'HK' || countryCode === 'MO';
}

async function reverseGeocodeWithAmap(coordinates: Coordinates, amapToken: string) {
	const searchParams = new URLSearchParams({
		key: amapToken,
		location: `${coordinates.longitude.toFixed(6)},${coordinates.latitude.toFixed(6)}`,
		radius: '2000'
	});

	try {
		const response = await fetch(
			`https://restapi.amap.com/v3/geocode/regeo?${searchParams.toString()}`
		);
		if (!response.ok) {
			console.error('高德地图api请求失败', response.status, await safeReadBody(response));
			return null;
		}

		const data = (await response.json()) as AMapResponse;
		if (data.status !== '1') {
			console.error('高德地图api请求失败', data);
			return null;
		}

		return data.regeocode?.formatted_address ?? null;
	} catch (err) {
		console.error('高德地图api请求失败', err);
		return null;
	}
}

async function reverseGeocodeWithMapbox(
	coordinates: Coordinates,
	mapboxToken: string,
	options: { language: string; worldview: string }
) {
	const searchParams = new URLSearchParams({
		longitude: String(coordinates.longitude),
		latitude: String(coordinates.latitude),
		language: options.language,
		worldview: options.worldview,
		limit: '1',
		access_token: mapboxToken
	});

	try {
		const response = await fetch(
			`https://api.mapbox.com/search/geocode/v6/reverse?${searchParams.toString()}`
		);

		if (!response.ok) {
			console.error(
				'mapbox reverse geocode request failed',
				response.status,
				await safeReadBody(response)
			);
			return null;
		}

		const data = (await response.json()) as MapboxResponse;
		const feature = data.features?.[0];
		return feature?.properties?.full_address ?? feature?.place_name ?? null;
	} catch (err) {
		console.error('mapbox reverse geocode request failed', err);
		return null;
	}
}

async function safeReadBody(response: { text(): Promise<string> }) {
	try {
		return await response.text();
	} catch (err) {
		console.error('Failed to read response body', err);
		return null;
	}
}

const languageMap = new Map<string, string>([
	['CN', 'zh'],
	['JP', 'ja'],
	['KR', 'ko'],
	['TW', 'zh_TW'],
	['MO', 'zh_TW'],
	['SG', 'zh'],
	['ES', 'es'],
	['MX', 'es'],
	['CL', 'es'],
	['FR', 'fr'],
	['DE', 'de'],
	['IT', 'it'],
	['NL', 'nl'],
	['PT', 'pt'],
	['BR', 'pt'],
	['TH', 'th'],
	['ID', 'id'],
	['SE', 'sv'],
	['IN', 'hi'],
	['IL', 'he'],
	['RU', 'ru'],
	['EG', 'ar'],
	['SA', 'ar'],
	['AE', 'ar'],
	['QA', 'ar'],
	['OM', 'ar'],
	['KW', 'ar'],
	['BH', 'ar'],
	['JO', 'ar'],
	['LB', 'ar'],
	['SY', 'ar'],
	['IQ', 'ar']
]);

const worldviewMap = new Map<string, string>([
	['CN', 'cn'],
	['AR', 'ar'],
	['IN', 'in'],
	['JP', 'jp'],
	['MA', 'ma'],
	['RU', 'ru'],
	['TR', 'tr'],
	['US', 'us']
]);
