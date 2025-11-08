import { error, type RequestHandler } from '@sveltejs/kit';
import exifr from 'exifr';
import getDateFormat from '$lib/functions/dateFormat';
import { deleteFromR2, getR2Bucket, type CfPlatform, uploadToR2 } from '$lib/server/r2';
import { resolveLocationWithSupabase } from '$lib/server/location';

type ExifMetadata = Record<string, unknown>;

type GeoJsonPoint = {
	type: 'Point';
	coordinates: [number, number];
};

const SUPPORTED_EXIF_TYPES = new Set(['image/jpeg', 'image/png', 'image/avif']);

async function parseExifMetadata(file: File, buffer: ArrayBuffer) {
	if (!SUPPORTED_EXIF_TYPES.has(file.type)) {
		return null;
	}

	try {
		return ((await exifr.parse(buffer)) as ExifMetadata) ?? null;
	} catch (err) {
		console.error('Failed to parse EXIF metadata', err);
		return null;
	}
}

function toOptionalString(value: FormDataEntryValue | null) {
	if (typeof value === 'string' && value.length > 0) {
		return value;
	}
	return undefined;
}

function getExifValue(exif: ExifMetadata | null | undefined, ...keys: string[]) {
	if (!exif) {
		return undefined;
	}

	for (const key of keys) {
		const value = exif[key];
		if (value !== undefined && value !== null) {
			return value;
		}
	}

	return undefined;
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		const fractionMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);

		if (fractionMatch) {
			const numerator = Number(fractionMatch[1]);
			const denominator = Number(fractionMatch[2]);

			if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
				return numerator / denominator;
			}
		}

		const numeric = Number(trimmed);

		return Number.isFinite(numeric) ? numeric : null;
	}

	if (Array.isArray(value)) {
		return null;
	}

	if (typeof value === 'object' && value !== null) {
		const obj = value as Record<string, unknown>;
		const numerator = obj['numerator'] ?? obj['num'];
		const denominator = obj['denominator'] ?? obj['den'];

		if (numerator !== undefined && denominator !== undefined) {
			const numeratorValue = toFiniteNumber(numerator);
			const denominatorValue = toFiniteNumber(denominator);

			if (
				numeratorValue !== null &&
				denominatorValue !== null &&
				denominatorValue !== 0
			) {
				return numeratorValue / denominatorValue;
			}
		}

		if (obj['value'] !== undefined) {
			return toFiniteNumber(obj['value']);
		}
	}

	return null;
}

function toDecimalDegrees(value: unknown): number | null {
	if (Array.isArray(value) && value.length) {
		const [degRaw, minRaw, secRaw] = value;
		const deg = toFiniteNumber(degRaw);

		if (deg === null) {
			return null;
		}

		const min = minRaw !== undefined ? toFiniteNumber(minRaw) ?? 0 : 0;
		const sec = secRaw !== undefined ? toFiniteNumber(secRaw) ?? 0 : 0;

		return deg + min / 60 + sec / 3600;
	}

	const numeric = toFiniteNumber(value);

	if (numeric !== null) {
		return numeric;
	}

	if (typeof value === 'string') {
		const matches = value.match(/-?\d+(?:\.\d+)?/g);

		if (matches?.length) {
			const deg = Number(matches[0]);
			const min = matches[1] ? Number(matches[1]) : 0;
			const sec = matches[2] ? Number(matches[2]) : 0;

			if ([deg, min, sec].every(Number.isFinite)) {
				return deg + min / 60 + sec / 3600;
			}
		}
	}

	return null;
}

function parseCoordinate(value: unknown, ref: unknown): number | null {
	const decimal = toDecimalDegrees(value);

	if (decimal === null) {
		return null;
	}

	let result = decimal;
	let direction = typeof ref === 'string' && ref.trim().length ? ref.trim() : undefined;

	if (!direction && typeof value === 'string') {
		const match = value.match(/[NSEW]/i);

		if (match) {
			direction = match[0];
		}
	}

	if (direction) {
		const normalized = direction[0]?.toUpperCase();

		if (normalized === 'S' || normalized === 'W') {
			result = -Math.abs(decimal);
		} else if (normalized === 'N' || normalized === 'E') {
			result = Math.abs(decimal);
		}
	}

	return Number.isFinite(result) ? result : null;
}

function extractGpsPoint(exif: ExifMetadata | null | undefined): GeoJsonPoint | null {
	if (!exif) {
		return null;
	}

	const latValue = getExifValue(exif, 'GPSLatitude', 'gpsLatitude', 'Latitude', 'latitude', 'lat');
	const lonValue = getExifValue(
		exif,
		'GPSLongitude',
		'gpsLongitude',
		'Longitude',
		'longitude',
		'lng',
		'lon'
	);
	const latRef = getExifValue(exif, 'GPSLatitudeRef', 'gpsLatitudeRef', 'LatitudeRef', 'latitudeRef');
	const lonRef = getExifValue(
		exif,
		'GPSLongitudeRef',
		'gpsLongitudeRef',
		'LongitudeRef',
		'longitudeRef'
	);

	let latitude = parseCoordinate(latValue, latRef);
	let longitude = parseCoordinate(lonValue, lonRef);

	if ((latitude === null || longitude === null) && typeof getExifValue(exif, 'GPSPosition') === 'string') {
		const position = getExifValue(exif, 'GPSPosition') as string;
		const [latPart, lonPart] = position.split(/[,;]/).map((part) => part.trim());

		if (latPart && lonPart) {
			latitude = parseCoordinate(latPart, latRef ?? latPart);
			longitude = parseCoordinate(lonPart, lonRef ?? lonPart);
		}
	}

	if (latitude === null || longitude === null) {
		return null;
	}

	return {
		type: 'Point',
		coordinates: [longitude, latitude]
	};
}

export const POST: RequestHandler = async ({ request, locals: { supabase }, platform }) => {
	const formData = await request.formData();
	const file = formData.get('file');
	const width = toOptionalString(formData.get('width'));
	const height = toOptionalString(formData.get('height'));

	if (!(file instanceof File)) {
		error(400, 'Bad request: Missing `file`');
	}

	const bucket = getR2Bucket(platform as CfPlatform);
	if (!bucket) {
		error(500, 'R2 bucket binding is not configured');
	}

	const fileBuffer = await file.arrayBuffer();
	const exif = await parseExifMetadata(file, fileBuffer);
	const takenAt = (exif?.DateTimeOriginal as string | Date | null | undefined) ?? null;
	const location = exif
		? await resolveLocationWithSupabase({ exif }, supabase).catch((err) => {
				console.error('Failed to resolve location', err);
				return null;
			})
		: 'No GPS data';

	const gpsPoint = extractGpsPoint(exif);
	const { storageKey } = await uploadToR2({
		bucket,
		file,
		arrayBuffer: fileBuffer,
		metadata: {
			width,
			height,
			location: location ?? ''
		}
	});
	const dateString = new Date().toISOString();

	// 存储到supabase
	// 对于 PostGIS GEOGRAPHY 类型，使用 WKT 格式字符串
	// 如果 Supabase 不支持直接插入 WKT，我们需要使用 RPC 调用
	const insertData: Record<string, unknown> = {
		folder: 'default',
		file_name: file.name,
		storage_key: storageKey,
		location,
		taken_at: takenAt,
		exif,
		date: getDateFormat(dateString, false),
		width,
		height,
		size: file.size,
		format: file.type.split('/')[1]
	};

	// 如果有 GPS 数据，使用 PostGIS 函数插入
	if (gpsPoint) {
		// 使用 RPC 调用 PostGIS 函数，或者直接使用 WKT 格式
		// Supabase PostGIS 支持 WKT 格式字符串
		const [longitude, latitude] = gpsPoint.coordinates;
		insertData.gps_location = `POINT(${longitude} ${latitude})`;
	}

	const { data, error: saveDataError } = await supabase
		.from('image')
		.insert(insertData)
		.select();

	if (saveDataError) {
		console.error(saveDataError);
		error(502, 'Error saving data');
	}

	// 返回完整的数据条目
	return new Response(JSON.stringify(data), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export const DELETE: RequestHandler = async ({ request, locals: { supabase }, platform }) => {
	const { keys }: { keys: string[] } = await request.json();

	if (!Array.isArray(keys) || keys.length === 0) {
		error(400, 'Bad request: Missing `keys`');
	}

	const bucket = getR2Bucket(platform as CfPlatform);
	if (!bucket) {
		error(500, 'R2 bucket binding is not configured');
	}

	await deleteFromR2(bucket, keys);

	const { error: deleteDataError } = await supabase
		.from('image')
		.delete()
		.in('storage_key', keys)
		.select();

	if (deleteDataError) {
		console.error(deleteDataError);
		error(502, 'Error deleting data');
	}

	return new Response(`Successfully deleted ${keys.length} images`, {
		headers: { 'Content-Type': 'text/plain' }
	});
}
