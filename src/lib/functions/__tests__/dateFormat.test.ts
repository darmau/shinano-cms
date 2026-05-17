import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getDateFormat from '../dateFormat';

describe('getDateFormat', () => {
	it('formats an ISO string as YYYY-MM-DD by default', () => {
		expect(getDateFormat('2024-03-15T08:09:10Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('includes time when withTime is true', () => {
		const result = getDateFormat('2024-03-15T08:09:10Z', true);
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
	});

	it('zero-pads single-digit month, day, hour, minute, second', () => {
		// Use a fixed local-time construction by passing a date-only string that the
		// implementation will treat as local. We assert the padding pattern, not the
		// absolute timezone-shifted values.
		const result = getDateFormat('2024-01-02T03:04:05', true);
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
	});

	it('falls back to current date when the input is invalid', () => {
		const fixedNow = new Date('2030-06-07T12:00:00Z');
		beforeEachVi(fixedNow);
		try {
			expect(getDateFormat('not-a-date')).toBe('2030-06-07');
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not return "NaN-NaN-NaN" for empty input', () => {
		const fixedNow = new Date('2030-06-07T12:00:00Z');
		beforeEachVi(fixedNow);
		try {
			const result = getDateFormat('');
			expect(result).not.toMatch(/NaN/);
		} finally {
			vi.useRealTimers();
		}
	});
});

function beforeEachVi(date: Date) {
	vi.useFakeTimers();
	vi.setSystemTime(date);
}
