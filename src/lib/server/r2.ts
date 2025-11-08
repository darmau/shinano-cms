type R2CustomMetadata = Record<string, string>;

export type R2ObjectBody = {
	arrayBuffer: () => Promise<ArrayBuffer>;
	text?: () => Promise<string>;
	json?: () => Promise<unknown>;
	size?: number;
} & Record<string, unknown>;

export type R2Bucket = {
	put: (
		key: string,
		value: Blob | ArrayBuffer | ArrayBufferView | ReadableStream | null,
		options?: { customMetadata?: R2CustomMetadata }
	) => Promise<unknown>;
	delete: (key: string) => Promise<unknown>;
	get: (key: string) => Promise<R2ObjectBody | null>;
};

export type CfEnv = {
	STORAGE?: R2Bucket;
} & Record<string, unknown>;

export type CfPlatform = {
	env?: CfEnv;
};

export type UploadToR2Params = {
	bucket: R2Bucket;
	file: File;
	metadata?: Record<string, string | number | null | undefined>;
	arrayBuffer?: ArrayBuffer;
	stripExif?: boolean;
	storageKey?: string;
};

export async function uploadToR2({
	bucket,
	file,
	metadata = {},
	arrayBuffer,
	stripExif = true,
	storageKey
}: UploadToR2Params) {
	if (!bucket) {
		throw new Error('R2 bucket is not configured.');
	}

	const key = storageKey ?? crypto.randomUUID();
	const sanitizedFile = stripExif ? await createFileWithoutExif(file, arrayBuffer) : file;

	const customMetadata: R2CustomMetadata = {
		file_name: file.name,
		file_type: file.type,
		file_size: String(file.size)
	};

	for (const [metaKey, value] of Object.entries(metadata)) {
		if (value === undefined || value === null) {
			continue;
		}
		customMetadata[metaKey] = String(value);
	}

	await bucket.put(key, sanitizedFile, {
		customMetadata
	});

	return { storageKey: key };
}

export async function deleteFromR2(bucket: R2Bucket | undefined, keys: string[]) {
	if (!bucket) {
		throw new Error('R2 bucket is not configured.');
	}

	await Promise.all(keys.map((key) => bucket.delete(key)));
}

async function createFileWithoutExif(file: File, providedBuffer?: ArrayBuffer) {
	const arrayBuffer = providedBuffer ?? (await file.arrayBuffer());
	const cleanedBuffer = stripExifSegments(arrayBuffer);
	return new File([cleanedBuffer], file.name, { type: file.type });
}

function stripExifSegments(buffer: ArrayBuffer) {
	let dataView = new DataView(buffer);
	const EXIF_MARKER = 0xffe1;
	let offset = 2;

	while (offset + 4 <= dataView.byteLength) {
		const marker = dataView.getUint16(offset);

		if (marker === EXIF_MARKER) {
			const length = dataView.getUint16(offset + 2, false) + 2;
			buffer = removeSegment(buffer, offset, length);
			dataView = new DataView(buffer);
			continue;
		}

		const segmentLength = dataView.getUint16(offset + 2, false);
		if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
			break;
		}

		offset += 2 + segmentLength;
	}

	return buffer;
}

function removeSegment(buffer: ArrayBuffer, offset: number, length: number) {
	const head = buffer.slice(0, offset);
	const tail = buffer.slice(offset + length);
	const merged = new Uint8Array(head.byteLength + tail.byteLength);
	merged.set(new Uint8Array(head), 0);
	merged.set(new Uint8Array(tail), head.byteLength);
	return merged.buffer;
}

export function getR2Bucket(platform?: CfPlatform) {
	return platform?.env?.STORAGE;
}
