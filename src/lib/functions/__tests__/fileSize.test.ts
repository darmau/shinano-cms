import { describe, expect, it } from 'vitest';
import { fileSize } from '../fileSize';

describe('fileSize', () => {
	it('formats bytes', () => {
		expect(fileSize(0)).toBe('0.00 B');
		expect(fileSize(512)).toBe('512.00 B');
	});

	it('scales up to KB / MB / GB', () => {
		expect(fileSize(1024)).toBe('1.00 KB');
		expect(fileSize(1024 * 1024)).toBe('1.00 MB');
		expect(fileSize(1024 ** 3)).toBe('1.00 GB');
	});

	it('does not index out of the unit array for very large values', () => {
		// 1024^9 would overflow the original units list. We expect a defined unit.
		const huge = 1024 ** 9;
		expect(fileSize(huge)).toMatch(/^\d+\.\d{2} (YB|ZB|EB|PB|TB|GB)$/);
	});

	it('returns a finite, non-negative result for negative input', () => {
		expect(fileSize(-100)).toMatch(/^\d+\.\d{2} B$/);
	});

	it('handles non-finite input without looping forever', () => {
		expect(fileSize(Number.POSITIVE_INFINITY)).toMatch(/^\d+\.\d{2} B$/);
		expect(fileSize(Number.NaN)).toMatch(/^\d+\.\d{2} B$/);
	});
});
