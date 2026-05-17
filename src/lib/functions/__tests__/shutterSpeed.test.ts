import { describe, expect, it } from 'vitest';
import shutterSpeed from '../shutterSpeed';

describe('shutterSpeed', () => {
	it('returns undefined for empty input', () => {
		expect(shutterSpeed('')).toBeUndefined();
	});

	it('returns the rounded integer for shutter time >= 1 second', () => {
		expect(shutterSpeed('1')).toBe('1');
		expect(shutterSpeed('2.4')).toBe('2');
		expect(shutterSpeed('15')).toBe('15');
	});

	it('returns 1/N fractional notation for sub-second shutter times', () => {
		expect(shutterSpeed('0.008')).toBe('1/125');
		expect(shutterSpeed('0.001')).toBe('1/1000');
		expect(shutterSpeed('0.5')).toBe('1/2');
	});

	it('returns undefined for zero or negative values', () => {
		expect(shutterSpeed('0')).toBeUndefined();
		expect(shutterSpeed('-0.5')).toBeUndefined();
	});

	it('returns undefined for non-numeric strings', () => {
		expect(shutterSpeed('abc')).toBeUndefined();
	});
});
